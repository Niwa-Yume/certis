import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('branding')
  getBranding(@Req() request: Request) {
    const host = request.get('host') ?? 'localhost:3000';
    const protocol = request.protocol ?? 'http';

    return {
      appName: 'Certis',
      logoPath: '/public/branding/certis-logo.png',
      logoUrl: `${protocol}://${host}/public/branding/certis-logo.png`,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth-test')
  authTest(@Req() request: Request & { user?: { id: string; email: string } }) {
    return {
      message: 'Route protegee accessible',
      user: request.user,
    };
  }
}
