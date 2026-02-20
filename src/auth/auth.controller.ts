import { Controller, Get, Patch, UseGuards, Request, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Post } from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginUserDto } from 'src/users/dto/login-user-dto';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private usersService: UsersService) { }

    @Post('register')
    register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }

    @Post('login')
    login(@Body() loginUserDto: LoginUserDto) {
        return this.authService.login(loginUserDto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Request() req) {
        return this.usersService.findMe(req.user.id);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    updateMe(@Request() req, @Body() dto: { name?: string; lastName?: string; preferredCurrency?: string }) {
        return this.usersService.updateMe(req.user.id, dto);
    }
}
