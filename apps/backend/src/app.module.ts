import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { ChildrenModule } from './modules/children/children.module';

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
  ],
})
export class AppModule {}
