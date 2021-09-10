export interface User {
  _id: string;
  email: string;
  profile: {
    firstName: string,
    lastName: string
  };
  /**
   * Personal services
   */
  services: Array<string>;
  roles: Array<Role>;
  sysadmin: boolean;
  updatedAt: Date;
}

export interface Role {
  organization: Organization;
  role: string;
  services: Array<ServiceMini>;
  teams: Array<string>;
}

export interface Organization {
  _id: string;
  domain: string;
  name: string;
}

export interface ServiceMini {
  service: string;
  role: string;
}

export interface Current {
  user: User;
  organization: Organization;
}