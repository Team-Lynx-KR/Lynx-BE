import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { StockService } from './stock.service';
import { StockSubscribeDto } from './dto/stock-subscribe.dto';
import { AuthGuard } from '@nestjs/passport';
import { UseGuards, OnModuleInit, Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class StockGateway {
  @WebSocketServer()
  server: Server;
  
  private clients = new Map<string, Socket>();

  constructor(
    @Inject(forwardRef(() => StockService))
    private readonly stockService: StockService
  ) {}

  handleConnection(client: Socket) {
    this.clients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.stockService.cleanupClient(client.id);
    this.clients.delete(client.id);
  }

  emitToClient(clientId: string, event: string, data: any) {
    const client = this.clients.get(clientId);
    if (client) {
      client.emit(event, data);
      return true;
    }
    return false;
  }
  
  // 종목 구독
  @SubscribeMessage('subscribe-stock')
  // @UseGuards(AuthGuard('jwt'))
  async handleSubscribeStock(
    @ConnectedSocket() client: Socket,
    @MessageBody() StockSubscribeDto: StockSubscribeDto,
  ) {
    return await this.stockService.subscribeStock(client.id, StockSubscribeDto);
  }
}