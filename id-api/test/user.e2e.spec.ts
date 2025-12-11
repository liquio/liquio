import bcrypt from 'bcrypt';

import { UserAttributes } from '../src/models';
import { TestApp, config } from './test_app';

describe('AuthController', () => {
  let app: TestApp;
  let adminToken: string;
  let users: {
    local1?: UserAttributes;
    local2?: UserAttributes;
  } = {};

  beforeAll(async () => {
    await TestApp.beforeAll();
  });

  afterAll(async () => {
    await app.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  it('should setup an app successfully', async () => {
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };

    adminToken = config.oauth?.secret_key?.[0] || '';

    try {
      app = await TestApp.setup();

      users.local1 = await app
        .model('user')
        .create(
          {
            email: 'localtest@email.test',
            first_name: 'Логін',
            last_name: 'Перевіряльський',
            middle_name: 'Паролевич',
            provider: 'local',
            ipn: '#1371kfxnfa',
            phone: '+380124567890',
            isActive: true,
            userIdentificationType: 'local',
          },
          { returning: true },
        )
        .then((row) => row.dataValues);

      await app.model('userServices').create({
        provider: 'local',
        provider_id: users.local1!.email!,
        userId: users.local1!.userId!,
        data: {
          password: bcrypt.hashSync('V4l!dPassW0rd', 1).toString(),
          oldPasswords: [],
        },
      });
    } catch (error: any) {
      throw new Error(`Failed to setup app: ${error.toString()}`);
    }
  });

  describe('Admin methods', () => {
    it('should fail to check if user email is already registered without an email parameter', async () => {
      await app
        .request()
        .get('/user/info/email/check')
        .set('Authorization', `Basic ${adminToken}`)
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({
            code: 100011,
            details: [
              {
                location: 'query',
                msg: 'Invalid value',
                path: 'email',
                type: 'field',
              },
            ],
            message: 'Validation error.',
          });
        });
    });

    it('should check if user email is already registered - exists', async () => {
      await app
        .request()
        .get('/user/info/email/check')
        .query({ email: users.local1!.email })
        .set('Authorization', `Basic ${adminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            isAllowed: true,
            isExist: true,
          });
        });
    });

    it('should check if user email is already registered - does not exist', async () => {
      await app
        .request()
        .get('/user/info/email/check')
        .query({ email: 'random@email.org' })
        .set('Authorization', `Basic ${adminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            isAllowed: true,
            isExist: false,
          });
        });
    });

    it('should be able to create a new local user', async () => {
      let userId: string = '';
      await app
        .request()
        .post('/user/create_local')
        .set('Authorization', `Basic ${adminToken}`)
        .send({
          email: 'localtest2@email.test',
          password: 'V4l!dPassW0rd',
          firstName: 'Вторяк',
          lastName: 'Заднодумний',
          middleName: 'Безхаткович',
          needOnboarding: false,
          onboardingTaskId: null,
          isChangeRequired: true,
        })
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual({
            success: true,
            userId: expect.any(String),
          });
          userId = body.userId;
        });

      users.local2 = await app
        .model('user')
        .findOne({
          where: { userId },
        })
        .then((row) => row?.dataValues);

      expect(users.local2).toBeDefined();
    });

    it('should be able to get user info by id', async () => {
      await app
        .request()
        .get(`/user/${users.local1!.userId}`)
        .set('Authorization', `Basic ${adminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            _id: users.local1!.userId,
            userId: users.local1!.userId,
            email: users.local1!.email,
            phone: '+380124567890',
            first_name: users.local1!.first_name,
            last_name: users.local1!.last_name,
            middle_name: users.local1!.middle_name,
            ipn: users.local1!.ipn,
            isActive: true,
            provider: 'local',
            role: 'individual',
            needOnboarding: true,
            isIndividualEntrepreneur: false,
            isLegal: false,
            valid: {
              email: false,
              phone: false,
            },
            services: {
              local: {
                id: expect.any(Number),
                provider: 'local',
                provider_id: users.local1!.email,
                userId: users.local1!.userId,
                data: {},
              },
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            address: null,
            addressStruct: {},
            avaUrl: null,
            birthday: null,
            companyName: null,
            companyUnit: null,
            edrpou: null,
            foreigners_document_expire_date: null,
            foreigners_document_issue_date: null,
            foreigners_document_issued_by: null,
            foreigners_document_number: null,
            foreigners_document_series: null,
            foreigners_document_type: {},
            gender: null,
            id_card_expiry_date: null,
            id_card_issue_date: null,
            id_card_issued_by: null,
            id_card_number: null,
            is_private_house: null,
            legalEntityDateRegistration: null,
            lockUserInfo: null,
            onboardingTaskId: null,
            passport_issue_date: null,
            passport_issued_by: null,
            passport_number: null,
            passport_series: null,
            password: null,
            status: null,
            twoFactorType: null,
            useTwoFactorAuth: false,
            userIdentificationType: 'local',
          });
        });
    });

    it('should fail to get user info by a wrong id', async () => {
      await app
        .request()
        .get('/user/999999999999999999999999')
        .set('Authorization', `Basic ${adminToken}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body).toEqual({});
        });
    });

    it('should find a user by phone - local1', async () => {
      await app
        .request()
        .get('/user/info/phone')
        .query({ phone: users.local1!.phone })
        .set('Authorization', `Basic ${adminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            _id: users.local1!.userId,
            userId: users.local1!.userId,
            email: users.local1!.email,
            phone: '+380124567890',
            first_name: users.local1!.first_name,
            last_name: users.local1!.last_name,
            middle_name: users.local1!.middle_name,
            ipn: users.local1!.ipn,
            isActive: true,
            provider: 'local',
            role: 'individual',
            needOnboarding: true,
            isIndividualEntrepreneur: false,
            isLegal: false,
            valid: {
              email: false,
              phone: false,
            },
            services: {
              local: {
                id: expect.any(Number),
                provider: 'local',
                provider_id: users.local1!.email,
                userId: users.local1!.userId,
                data: {},
              },
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          });
        });
    });

    it('should fail to find a user by phone without a phone parameter', async () => {
      await app
        .request()
        .get('/user/info/phone')
        .set('Authorization', `Basic ${adminToken}`)
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({});
        });
    });

    it('should fail to find a user by phone with an invalid phone number', async () => {
      await app
        .request()
        .get('/user/info/phone')
        .query({ phone: '1234567890' })
        .set('Authorization', `Basic ${adminToken}`)
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({});
        });
    });

    it('should fail to logout a user with an invalid id', async () => {
      await app
        .request()
        .post('/user/INVALI_ID/logout')
        .set('Authorization', `Basic ${adminToken}`)
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({});
        });
    });

    it('should be able to logout a user by id', async () => {
      await app
        .request()
        .post(`/user/${users.local1!.userId}/logout`)
        .set('Authorization', `Basic ${adminToken}`)
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual({ data: { accepted: true } });
        });
    });

    it('should be able to get a list of users without filters', async () => {
      await app
        .request()
        .get('/user')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', `Basic ${adminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toHaveLength(3);
          expect(body).toMatchObject([
            {
              userId: users.local2!.userId,
              email: users.local2!.email,
              phone: users.local2!.phone,
            },
            {
              userId: users.local1!.userId,
              email: users.local1!.email,
              phone: users.local1!.phone,
            },
            {
              email: 'admin',
              ipn: '0000000001',
            },
          ]);
        });
    });

    it('should be able to get a list of users with filters - by ipn', async () => {
      await app
        .request()
        .get('/user')
        .query({ limit: 10, offset: 0, ipn: users.local1!.ipn })
        .set('Authorization', `Basic ${adminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toHaveLength(1);
          expect(body).toMatchObject([
            {
              userId: users.local1!.userId,
              email: users.local1!.email,
              phone: users.local1!.phone,
            },
          ]);
        });
    });

    it('should not be able to delete a user if not enabled in config', async () => {
      await app
        .request()
        .delete(`/user`)
        .set('Authorization', `Basic ${adminToken}`)
        .send({ userId: users.local2!.userId })
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({
            message: 'Delete user route is not available',
            traceId: expect.any(String),
          });
        });
    });

    it('should be able to delete a user by id', async () => {
      config.enabledDeleteUser = true;

      await app
        .request()
        .delete(`/user`)
        .set('Authorization', `Basic ${adminToken}`)
        .send({ userId: users.local2!.userId })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ success: true });
        });

      users.local2 = await app
        .model('user')
        .findOne({
          where: { userId: users.local2!.userId },
        })
        .then((row) => row?.dataValues);

      // User data is soft deleted
      expect(users.local2).toMatchObject({
        address: null,
        addressStruct: {},
        avaUrl: null,
        birthday: null,
        companyName: null,
        companyUnit: null,
        createdAt: expect.any(Date),
        edrpou: null,
        email: null,
        first_name: null,
        foreigners_document_expire_date: null,
        foreigners_document_issue_date: null,
        foreigners_document_issued_by: null,
        foreigners_document_number: null,
        foreigners_document_series: null,
        foreigners_document_type: {},
        gender: null,
        id_card_expiry_date: null,
        id_card_issue_date: null,
        id_card_issued_by: null,
        id_card_number: null,
        ipn: null,
        isActive: false,
        isIndividualEntrepreneur: false,
        isLegal: false,
        is_private_house: false,
        last_name: null,
        legalEntityDateRegistration: null,
        lockUserInfo: null,
        middle_name: null,
        needOnboarding: false,
        onboardingTaskId: null,
        passport_issue_date: null,
        passport_issued_by: null,
        passport_number: null,
        passport_series: null,
        password: null,
        phone: null,
        provider: null,
        role: 'individual',
        status: null,
        twoFactorType: null,
        updatedAt: expect.any(Date),
        useTwoFactorAuth: false,
        userId: users.local2!.userId,
        userIdentificationType: 'unknown',
        valid: { email: false, phone: false },
      });
    });
  });
});
