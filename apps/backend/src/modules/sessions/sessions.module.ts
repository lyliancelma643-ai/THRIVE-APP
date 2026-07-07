import { Module } from '@nestjs/common';

// Squelette — la logique des séances vit côté Supabase (table sessions +
// trigger notify_on_session_scheduled). À étoffer si des endpoints REST
// dédiés deviennent nécessaires.
@Module({})
export class SessionsModule {}
