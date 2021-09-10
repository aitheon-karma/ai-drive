import { Service, Inject } from 'typedi';
import { UserSettingsSchema, UserSettings } from './user-settings.model';
import { environment } from '../../environment';

@Service()
export class UserSettingsService {

  async save(userSettings: UserSettings): Promise<UserSettings> {
    let query = { user: userSettings.user } as any;
    if (userSettings.organization) {
      query = { organization: userSettings.organization };
    }
    return UserSettingsSchema.findOneAndUpdate(query, userSettings, { new: true, upsert: true });
  }

  async findByUser(userId: string, organizationId: string): Promise<UserSettings> {
    return new Promise<UserSettings>(async (resolve, reject) => {
      let query = { user: userId } as any;
      if (organizationId) {
        query = { organization: organizationId };
      }
      let settings = await UserSettingsSchema.findOne(query);
      // 1GB
      if (!settings) {
        settings = Object.assign(query, { space: { used: 0, total: environment.defaultLimitDrive } });
      }
      resolve(settings);
    });
  }

}
