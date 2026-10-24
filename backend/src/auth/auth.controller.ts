import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { LoginDto, RegisterDto } from './dto/auth-credentials.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  // Force brute : 10 tentatives par minute et par IP.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // Le front adapte l'interface au rôle : seul un émetteur voit « Inscrire une pièce ».
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: Request & { user: { id: string } }) {
    return this.authService.me(request.user.id);
  }
}
