import { Injectable, MessageEvent } from '@nestjs/common';
import { ISessionCache, SessionType } from './dto/cache.dto';
import { Subject } from 'rxjs';

@Injectable()
export class CacheService {
  private sessions: SessionType;

  constructor() {
    this.sessions = new Map<string, ISessionCache>();
  }

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

  getSession(id: string): ISessionCache {
    return this.sessions.get(id);
  }

  markForDelete(id: string): void {
    const session = this.getSession(id);

    if (session) {
      session.delete = true;
      this.sessions.set(id, session);
    }
  }

  deleteSession(id: string) {
    const session = this.sessions.get(id);

    if (session && session.delete) {
      session.subject.complete();
      this.sessions.delete(id);
    }
  }
}
