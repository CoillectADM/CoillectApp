import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() // <- sem 'api' aqui
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('api') // <- aqui define o endpoint "/api"
  getApiStatus(): string {
    return this.appService.getHello();
  }
}
