import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;
  let prisma: any;

  const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test', lastName: 'User', password: 'hashed' };

  beforeEach(async () => {
    const mockTransaction = jest.fn().mockImplementation(async (cb) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue(mockUser) },
        workspace: { create: jest.fn().mockResolvedValue({ id: 'ws-1', isPersonal: true }) },
      };
      return cb(tx);
    });

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: PrismaService, useValue: { $transaction: mockTransaction } },
        { provide: WorkspacesService, useValue: { joinByToken: jest.fn() } },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('token') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
  });

  describe('register', () => {
    it('creates a user and a personal workspace in the same transaction', async () => {
      const dto = { email: 'test@test.com', name: 'Test', lastName: 'User', password: 'password123' };
      await service.register(dto);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('calls joinByToken when inviteToken is provided', async () => {
      const workspacesService = module.get<WorkspacesService>(WorkspacesService);
      const dto = { email: 'test@test.com', name: 'Test', lastName: 'User', password: 'password123', inviteToken: 'valid-token' };
      await service.register(dto);
      expect(workspacesService.joinByToken).toHaveBeenCalledWith('valid-token', mockUser.id);
    });

    it('does NOT call joinByToken when inviteToken is absent', async () => {
      const workspacesService = module.get<WorkspacesService>(WorkspacesService);
      const dto = { email: 'test@test.com', name: 'Test', lastName: 'User', password: 'password123' };
      await service.register(dto);
      expect(workspacesService.joinByToken).not.toHaveBeenCalled();
    });
  });
});
