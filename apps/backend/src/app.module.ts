import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { ChildrenModule } from './modules/children/children.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { ReportsModule } from './modules/reports/reports.module';
import { QuestionnairesModule } from './modules/questionnaires/questionnaires.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AuditModule } from './modules/audit/audit.module';
import { ContentModule } from './modules/content/content.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.development' }),
    AuthModule,
    UsersModule,
    FamiliesModule,
    ChildrenModule,
    ProgramsModule,
    EntitlementsModule,
    ReportsModule,
    QuestionnairesModule,
    MessagesModule,
    AuditModule,
    ContentModule,
    NotificationsModule,
  ],
})
export class AppModule {}
