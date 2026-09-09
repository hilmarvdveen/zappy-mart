import { HttpContextToken } from '@angular/common/http';

export const withoutAccessToken = new HttpContextToken<boolean>(() => false);
