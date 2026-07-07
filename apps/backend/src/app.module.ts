import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { ChildrenModule } from './modules/children/children.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '../../.env.development'],
    }),
    AuthModule,
    UsersModule,
    FamiliesModule,
    ChildrenModule,
    SessionsModule,
    ProgramsModule,
    NotificationsModule,
    MessagesModule,
  ],
})
export class AppModule {}
