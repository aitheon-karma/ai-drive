import { Action, Middleware, InternalServerError } from 'routing-controllers';
import * as request from 'request-promise-native';
import { Request } from 'express';
import { environment } from '../../environment';
import { logger } from '../logger';
import * as _ from 'lodash';
import * as mongoose from 'mongoose';
import { User, Role, Organization, ServiceMini } from './user';


/**
 * Process current user with call to auth uri with token.
 * @param action Routing action
 * @param roles User roles
 */
export const authorizationChecker = async (action: Action, roles: string[]): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      const result = await this.getUserFromRequest(action.request, roles);
      action.request.currentUser = result.user;
      action.request.currentOrganization = result.organization;

      if (result.user) {
        resolve(true);
      }
    } catch (error) {
      resolve(false);
    }
  });
};

export const getUserFromRequest = async (actionRequest: Request, roles: string[]): Promise<{ user: User, organization: Organization }> => {
  return new Promise<{ user: User, organization: Organization }>(async (resolve, reject) => {
    try {

      const servicePort = process.env.AI_AUTH_SERVICE_PORT || 3000;
      const authURI = `http://ai-auth.ai-auth.svc.cluster.local:${servicePort}`;

      const token = await getTokenFromRequest(actionRequest);
      if (!token) {
        logger.info('[Auth] Error: Token Missing');
        return reject();
      }

      const options = {
        url: `${authURI}/api/me`,
        headers: {
          'Content-type': 'application/json',
          'Authorization': `JWT ${token}`
        },
        json: true
      };

      const user = await request(options) as User;

      if (!user) {
        logger.info('[Auth] Error: No user from auth request');
        return reject();
      }

      const orgInfo = await getOrganizationInfoRequest(actionRequest);
      /**
       * Check if we have this service in user personal services
       */
      if (environment.service.serviceType === 'personal' && user.services.indexOf(environment.service._id) > -1 ||
          (!orgInfo && environment.service.serviceType === 'any')) {
        return resolve({ user: user, organization: undefined });
      }

      /**
       * User must be inside this organization to be continue for org only services
       */
      if (!orgInfo && environment.service.serviceType === 'organization') {
        logger.info('[Auth] organization access denied.', user._id);
        return reject();
      }

      let orgRole;
      if (orgInfo && (environment.service.serviceType === 'organization' || environment.service.serviceType === 'any')) {
        orgRole = user.roles.find((role: Role) => role.organization._id === orgInfo._id || role.organization.domain === orgInfo.domain);
      }
      if (!orgRole) {
        logger.info('[Auth] organization access denied.', JSON.stringify(orgRole), user._id);
        return reject();
      }

      /**
       * User have access to organization. Check if can access service
       * Info: service granulated roles is not implemented. Because it's future improvement
       */
      const currentService = orgRole.services.find((s: ServiceMini) => s.service === environment.service._id);
      if (!currentService) {
        logger.info('[Auth] service access denied.', JSON.stringify(orgRole), user._id);
        return reject();
      }

      /**
       * Check org roles if specified
       */
      if (roles && roles.length > 0) {
        const serviceRoles = roles.filter((r: string) => r.toUpperCase().startsWith('SERVICE'));
        const organizationRoles = roles.filter((r: string) => !r.toUpperCase().startsWith('SERVICE'));
        // organization role OR service role
        const haveOrgAccess = organizationRoles.indexOf(orgRole.role) > -1;
        const haveServiceAccess = serviceRoles.indexOf(currentService.role) > -1;
        if (!haveOrgAccess && !haveServiceAccess) {
          logger.info('[Auth] role access denied.', JSON.stringify(orgRole), user._id);
          return reject();
        }
      }
      resolve({
        user, organization: orgRole.organization
      });
    } catch (error) {
      logger.error('[AUTH] Error:', error);
      reject();
    }
  });
};

/**
 * Return current user and organization from request
 * @param action Routing action
 */
export const currentUserChecker = async (action: Action): Promise<{ user: User, organization: Organization }> => {
  return new Promise<{ user: User, organization: Organization }>((resolve, reject) => {
    if (!action.request.currentUser) {
      return resolve(undefined);
    }
    resolve({ user: action.request.currentUser, organization: action.request.currentOrganization });
  });
};

/**
 * Get token from request in that order: header, cookie, query
 * @param request Express request object
 */
export const getTokenFromRequest = async (request: Request): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    let token = '';
    const authorization = request.headers['authorization'] as string;
    if (authorization && authorization.indexOf('JWT ') > -1) {
      token = authorization.split(' ')[1];
    }
    if (!token) {
      token = request.cookies && request.cookies['fl_token'];
    }
    if (!token) {
      token = request.query['fl_token'];
    }
    resolve(token);
  });
};

const IP_REGEXP = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;

const getOrganizationInfoRequest = async (req: Request): Promise<{ _id: string, domain: string }> => {
  return new Promise<{ _id: string, domain: string }>((resolve, reject) => {

    let host = (req.headers['origin'] || req.headers['host']) as string;
    host = host.replace(/^(http|https):\/\//, '');
    const domains = host.split('.');


    let organizationDomain;
    if (req.headers['organization-domain']) {
      organizationDomain = req.headers['organization-domain'];
    }

    if (!organizationDomain) {
      organizationDomain = req.query && req.query['organization-domain'];
    }

    const hostname = host.split(':')[0];
    const isIp = IP_REGEXP.test(hostname);
    if (domains.length > 2 && !isIp) {
      const baseDomain = process.env.DOMAIN || req.cookies['base_host'];
      if (baseDomain) {
        organizationDomain = host.replace(baseDomain, '').slice(0, -1);
      } else {
        organizationDomain = domains[0];
      }
    }

    let _id = req.cookies['organization-id'];
    // header must override any cookie value
    if (req.headers['organization-id']) {
      _id = req.headers['organization-id'];
    }

    if (!organizationDomain && !_id) {
      return resolve();
    }
    resolve({ domain: organizationDomain, _id: _id });
  });
};