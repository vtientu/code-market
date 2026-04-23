import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// Guard that restricts access by configured IP CSV list.
// Empty env = allow all (dev). Subclass sets CONFIG_KEY to pick the allowlist.
@Injectable()
export abstract class IpAllowlistGuard implements CanActivate {
  private readonly logger = new Logger(IpAllowlistGuard.name);
  protected abstract readonly configKey: string;

  constructor(protected readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const raw = this.config.get<string>(this.configKey, '').trim();
    if (!raw) return true; // empty list = allow (dev/local)

    const allowed = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    if (!allowed.includes(ip)) {
      this.logger.warn(
        `Webhook IP ${ip} not in allowlist for ${this.configKey}`,
      );
      throw new ForbiddenException('Source IP not allowed');
    }
    return true;
  }
}

@Injectable()
export class MomoIpAllowlistGuard extends IpAllowlistGuard {
  protected readonly configKey = 'MOMO_IPN_ALLOWED_IPS';
}

@Injectable()
export class VnpayIpAllowlistGuard extends IpAllowlistGuard {
  protected readonly configKey = 'VNPAY_IPN_ALLOWED_IPS';
}
