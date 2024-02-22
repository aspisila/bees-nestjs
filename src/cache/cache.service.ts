import { Injectable, MessageEvent } from '@nestjs/common';
import { ISessionCache, SessionType } from './dto/cache.dto';
import { Subject } from 'rxjs';

@Injectable()
export class CacheService {
  private sessions: SessionType;

  constructor() {
    this.sessions = new Map<string, ISessionCache>();
  }

  /**
   * Add new bee into local session cache
   * @param beeName unique Bee name
   * @returns ISessionCache
   */
  addSession(beeName: string): ISessionCache {
    const beeSession: ISessionCache = {
      beeName,
      subject: new Subject<MessageEvent>(),
      exp: 1000 * 1000,
      delete: false,
    };

    this.sessions.set(beeName, beeSession);
    return beeSession;
  }

  /**
   * Get specific session cache by Bee Name
   * @param beeName unique bee name
   * @returns ISessionCache
   */
  getSession(beeName: string): ISessionCache {
    return this.sessions.get(beeName);
  }

  /**
   * Delete specific session cache by Bee name
   * @param beeName unique bee name
   */
  deleteSession(beeName: string) {
    const session = this.sessions.get(beeName);

    if (session && session.delete) {
      session.subject.complete();
      this.sessions.delete(beeName);
    }
  }
}
