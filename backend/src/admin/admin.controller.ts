import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { APIResponse } from '../utils/response/response';
import { AdminService } from './admin.service';
import { CreateCondominiumDto, UpdateCondominiumDto } from './dto/condominium.dto';
import {
  CreateBarrelDto,
  CreateSensorDto,
  UpdateBarrelDto,
  UpdateSensorDto,
} from './dto/sensor-admin.dto';
import { AdminCreateCompanyDto, CreateSindicoDto } from './dto/people.dto';

function ok(data: unknown, message: string, statusCode = 200): APIResponse {
  return new APIResponse()
    .setData(data)
    .setError(false)
    .setStatusCode(statusCode)
    .setRequester('admin')
    .setMessage(message)
    .build();
}

/**
 * Rotas da interface-desktop-adm-coillect. Sem login no MVP, como a interface
 * desktop atual espera.
 */
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Desktop: visão geral (contadores, barris e últimas solicitações)',
  })
  async overview(): Promise<APIResponse> {
    return ok(await this.adminService.overview(), 'Visão geral do Coillect');
  }

  @Get('condominiums')
  @ApiOperation({ summary: 'Desktop: lista condomínios com síndico, empresa, barris e sensores' })
  async condominiums(): Promise<APIResponse> {
    return ok(await this.adminService.listCondominiums(), 'Condomínios');
  }

  @Post('condominiums')
  @ApiOperation({ summary: 'Desktop: cadastra condomínio e vincula síndico/empresa' })
  async createCondominium(@Body() dto: CreateCondominiumDto): Promise<APIResponse> {
    return ok(
      await this.adminService.createCondominium(dto),
      'Condomínio cadastrado',
      201,
    );
  }

  @Patch('condominiums/:id')
  @ApiOperation({ summary: 'Desktop: altera condomínio ou seus vínculos' })
  async updateCondominium(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCondominiumDto,
  ): Promise<APIResponse> {
    return ok(
      await this.adminService.updateCondominium(id, dto),
      'Condomínio atualizado',
    );
  }

  @Get('barrels')
  @ApiOperation({ summary: 'Desktop: lista barris com condomínio e sensor instalado' })
  async barrels(): Promise<APIResponse> {
    return ok(await this.adminService.listBarrels(), 'Barris');
  }

  @Post('barrels')
  @ApiOperation({ summary: 'Desktop: cadastra um barril e vincula ao condomínio' })
  async createBarrel(@Body() dto: CreateBarrelDto): Promise<APIResponse> {
    return ok(await this.adminService.createBarrel(dto), 'Barril cadastrado', 201);
  }

  @Patch('barrels/:id')
  @ApiOperation({ summary: 'Desktop: altera condomínio, capacidade ou limite do barril' })
  async updateBarrel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBarrelDto,
  ): Promise<APIResponse> {
    return ok(await this.adminService.updateBarrel(id, dto), 'Barril atualizado');
  }

  @Get('sensors')
  @ApiOperation({ summary: 'Desktop: lista sensores com barril, condomínio e nível' })
  async sensors(): Promise<APIResponse> {
    return ok(await this.adminService.listSensors(), 'Sensores');
  }

  @Post('sensors')
  @ApiOperation({
    summary:
      'Desktop: cadastra um sensor (ex.: o ESP32 físico) e instala no barril (barrelId)',
  })
  async createSensor(@Body() dto: CreateSensorDto): Promise<APIResponse> {
    return ok(await this.adminService.createSensor(dto), 'Sensor cadastrado', 201);
  }

  @Patch('sensors/:sensorId')
  @ApiOperation({
    summary: 'Desktop: troca o barril do sensor ou altera limite/capacidade do barril',
  })
  async updateSensor(
    @Param('sensorId') sensorId: string,
    @Body() dto: UpdateSensorDto,
  ): Promise<APIResponse> {
    return ok(
      await this.adminService.updateSensor(sensorId, dto),
      'Sensor atualizado',
    );
  }

  @Get('readings')
  @ApiOperation({ summary: 'Desktop: últimas leituras recebidas dos sensores' })
  @ApiQuery({ name: 'sensorId', required: false, example: 'CLT-8472-A' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async readings(
    @Query('sensorId') sensorId?: string,
    @Query('limit') limit?: string,
  ): Promise<APIResponse> {
    return ok(
      await this.adminService.listReadings(
        sensorId || undefined,
        limit ? Number(limit) || 50 : 50,
      ),
      'Leituras recentes',
    );
  }

  @Get('sindicos')
  @ApiOperation({ summary: 'Desktop: síndicos para vincular a condomínios' })
  async sindicos(): Promise<APIResponse> {
    return ok(await this.adminService.listSindicos(), 'Síndicos');
  }

  @Post('sindicos')
  @ApiOperation({
    summary: 'Desktop: cadastra um síndico (login no app do síndico com e-mail e senha)',
  })
  async createSindico(@Body() dto: CreateSindicoDto): Promise<APIResponse> {
    return ok(await this.adminService.createSindico(dto), 'Síndico cadastrado', 201);
  }

  @Get('users')
  @ApiOperation({ summary: 'Desktop: mesmo que GET /api/admin/sindicos (nome antigo)' })
  async users(): Promise<APIResponse> {
    return ok(await this.adminService.listSindicos(), 'Usuários');
  }

  @Get('companies')
  @ApiOperation({ summary: 'Desktop: empresas coletoras para vincular a condomínios' })
  async companies(): Promise<APIResponse> {
    return ok(await this.adminService.listCompanies(), 'Empresas');
  }

  @Post('companies')
  @ApiOperation({
    summary: 'Desktop: cadastra uma empresa coletora (login no app da empresa)',
  })
  async createCompany(@Body() dto: AdminCreateCompanyDto): Promise<APIResponse> {
    return ok(await this.adminService.createCompany(dto), 'Empresa cadastrada', 201);
  }

  @Post('demo/reset')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Desktop: reinicia a demonstração (apaga solicitações, notificações e leituras; barris voltam ao nível inicial)',
  })
  async resetDemo(): Promise<APIResponse> {
    return ok(await this.adminService.resetDemo(), 'Demonstração reiniciada');
  }
}
