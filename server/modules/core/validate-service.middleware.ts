import { ExpressMiddlewareInterface } from 'routing-controllers';
import { RedisService } from '../shared/redis.service';
import { Inject } from 'typedi';
import { logger } from '@aitheon/core-server';

const INTERNAL_REQUEST_IDENTIFIER_PREFIX = 'rip_';
const INTERNAL_REQUEST_IDENTIFIER_HEADER = 'x-service-string';

export class ValidateServiceId implements ExpressMiddlewareInterface {
    @Inject()
    redisService: RedisService;
    use(request: any, response: any, next?: (err?: any) => any): any {
        const {[INTERNAL_REQUEST_IDENTIFIER_HEADER]: id} = request.headers;
        this.redisService.getKey(INTERNAL_REQUEST_IDENTIFIER_PREFIX + id)
          .then(result => {
            if (typeof result === 'undefined' || result === null) {
              next(new Error('Service string not valid'));
            }
            request.params.__requestingService = result;
            this.redisService.removeKey(INTERNAL_REQUEST_IDENTIFIER_PREFIX + id);
            next();
          })
          .catch(err => {
            logger.error(err);
            next(new Error('Internal Server Error'));
          });

    }

}