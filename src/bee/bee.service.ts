import {
  ForbiddenException,
  Injectable,
  Logger,
  MessageEvent,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { BeeRequestDto } from './dto/bee.request.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Bee } from '../database/schemas/bee.schema';
import { Model } from 'mongoose';
import { Observable } from 'rxjs';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class BeeService implements OnApplicationBootstrap {
  constructor(
    private readonly cacheService: CacheService,
    @InjectModel(Bee.name) private beeModel: Model<Bee>,
  ) {}

  /**
   * Start application without old bees registred
   */
  async onApplicationBootstrap() {
    await this.beeModel.deleteMany();
    Logger.log('Bees database has been restarted.', 'BeeService');
  }

  /**
   * Get all Bees registred on dabase
   * @param page numer of specific page, 0 as default
   * @param limit number of limit per page, 25 as default
   * @returns list of bees registred on database.
   */
  async getBees(page = 0, limit = 25) {
    return this.beeModel.find().sort('name').limit(limit).skip(page);
  }

  /**
   * Verifiy if the bee name already registred on database
   * @param name unique bee name
   */
  private async checkBeeName(name: string) {
    const check = await this.beeModel.findOne({ name });

    if (check) {
      throw new ForbiddenException({ name: 'alreadyInUse' });
    }
  }

  /**
   * Add new bee,
   * verify if the name already exist so add in mongoDb
   * and create a new local session
   * @param body payload with bee name
   * @returns Observable to SSE client
   */
  async addBee(body: BeeRequestDto): Promise<Observable<MessageEvent>> {
    await this.checkBeeName(body.name);
    await new this.beeModel({ name: body.name }).save();

    return await this.addBeeSession(body.name);
  }

  /**
   * Verify if session not exist, so add the unique name into cache session
   * @param name unique bee name
   * @returns
   */
  private async addBeeSession(name: string): Promise<Observable<MessageEvent>> {
    try {
      let client = this.cacheService.getSession(name);
      if (!client || (client && client.subject.closed)) {
        client = this.cacheService.addSession(name);

        const tokenExpiration = 4 * 3600000;
        this.disconnectAfter(name, tokenExpiration);
      }

      return client.subject.asObservable();
    } catch (error) {
      Logger.error(error, 'addBee');
    }
  }

  /**
   * Public method to share the cache sessions
   * @param beeName unique string of bee name
   * @returns ISessionCache with "subject" to SSE communication
   */
  getBeeSession(beeName: string) {
    return this.cacheService.getSession(beeName);
  }

  /**
   * Define the maximium time to bee keep connected on SSE
   * @param beeName unique bee name
   * @param interval time in miliseconds to disconnect be from SSE
   * @returns NodeJS.Timeout
   */
  private disconnectAfter(beeName: string, interval: number): NodeJS.Timeout {
    return setTimeout(() => {
      this.disconnect(beeName);
    }, interval);
  }

  /**
   * Delete Bee from cache session
   * @param beeName unique bee name
   */
  private async disconnect(beeName: string): Promise<void> {
    await this.beeModel.deleteOne({ name: beeName });
    this.cacheService.deleteSession(beeName);
  }
}
