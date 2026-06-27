import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { createHmac } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { resetDb, seedUserWithMember } from './helpers';
import { CreditService } from '../src/billing/credit.service';

// BILL-01: Stripe webhook → idempotent credit grant.
describe('Stripe webhook credit grant (BILL-01)', () => {
  let app: INestApplication; let prisma: PrismaService; let credit: CreditService;
  const secret = 'whsec_test';

  beforeAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    process.env.STRIPE_CREDIT_PACKS = 'price_pro:5000';
  });
  beforeEach(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    credit = app.get(CreditService);
    await resetDb(prisma);
  });
  afterEach(async () => { await app.close(); });

  const balanceOf = async (ws: string) => (await credit.getBalance(ws)).balance;

  function post(bodyObj: object) {
    const raw = JSON.stringify(bodyObj);
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
    return request(app.getHttpServer())
      .post('/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', `t=${ts},v1=${sig}`)
      .send(raw);
  }

  it('grants credits on payment_intent.succeeded and dedups redelivery', async () => {
    const { workspace } = await seedUserWithMember(prisma);
    await credit.getBalance(workspace.id); // grant 100
    const event = {
      id: 'evt_1', type: 'payment_intent.succeeded',
      data: { object: { metadata: { workspaceId: workspace.id, priceId: 'price_pro' } } },
    };

    const r1 = await post(event).expect(201);
    expect(r1.body.value.granted).toBe(5000);
    expect(await balanceOf(workspace.id)).toBe(5100);

    // redelivery of the same event id → no double credit
    const r2 = await post(event).expect(201);
    expect(r2.body.value.deduped).toBe(true);
    expect(await balanceOf(workspace.id)).toBe(5100);
  });

  it('rejects an invalid signature with 403', async () => {
    await request(app.getHttpServer())
      .post('/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=deadbeef')
      .send(JSON.stringify({ id: 'evt_x', type: 'payment_intent.succeeded' }))
      .expect(403);
  });

  it('ignores non-granting event types', async () => {
    const r = await post({ id: 'evt_2', type: 'customer.created', data: { object: {} } }).expect(201);
    expect(r.body.value.ignored).toBe(true);
  });
});
