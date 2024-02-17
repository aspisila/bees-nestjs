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

  private async checkBeeName(name: string) {
    const check = await this.beeModel.findOne({ name });

    if (check) {
      throw new ForbiddenException({ name: 'alreadyInUse' });
    }
  }

  async addBee(body: BeeRequestDto): Promise<Observable<MessageEvent>> {
    await this.checkBeeName(body.name);
    await new this.beeModel({ name: body.name }).save();

    try {
      let client = this.cacheService.getSession(body.name);
      if (!client || (client && client.subject.closed)) {
        client = this.cacheService.addSession(body.name);

        const tokenExpiration = 4 * 3600000;
        this.disconnectAfter(body.name, tokenExpiration);
      }

      return client.subject.asObservable();
    } catch (error) {
      Logger.error(error, 'addBee');
    }
  }

  getBeeSession(beeName: string) {
    return this.cacheService.getSession(beeName);
  }

  async getBees() {
    return this.beeModel.find();
  }

  private disconnectAfter(beeName: string, interval: number): any {
    return setTimeout(() => {
      this.disconnect(beeName);
    }, interval);
  }

  private async disconnect(beeName: string): Promise<void> {
    await this.beeModel.deleteOne({ name: beeName });
    this.cacheService.deleteSession(beeName);
  }
}
