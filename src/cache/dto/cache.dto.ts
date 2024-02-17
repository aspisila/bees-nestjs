import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface ISessionCache {
  beeName: string;
  subject: Subject<MessageEvent>;
  exp: number;
  delete: boolean;
}

export interface ICacheEvent {
  data: MessageEvent;
  date: number;
  id: string;
}

export type SessionType = Map<string, ISessionCache>;
