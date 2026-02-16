import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginUserDto } from 'src/users/dto/login-user-dto';
import { UsersService } from 'src/users/users.service';
import { hash, compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

    constructor(private usersService: UsersService, private jwtService: JwtService) { }

    async register(createUserDto: CreateUserDto) {
        try {
            const { email, password, name, lastName } = createUserDto;

            const user = await this.usersService.findOne({ email });
            if (user) {
                throw new ConflictException('User already exists');
            }
            const hashedPassword = await hash(password, 10);
            const newUser = await this.usersService.create({
                email,
                password: hashedPassword,
                name,
                lastName,
            });
            const { password: _, ...result } = newUser;

            // Generate token for automatic sign-in
            const access_token = await this.jwtService.signAsync({ id: newUser.id, email: newUser.email });

            return { ...result, access_token };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async login(loginUserDto: LoginUserDto) {
        try {
            const { email, password } = loginUserDto;
            const user = await this.usersService.findOne({ email });
            if (!user) {
                throw new UnauthorizedException('Invalid credentials');
            }
            const isPasswordValid = await compare(password, user.password);
            if (!isPasswordValid) {
                throw new UnauthorizedException('Invalid credentials');
            }
            const { password: _, ...result } = user;
            const access_token = await this.jwtService.signAsync({ id: user.id, email: user.email });
            return { ...result, access_token };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

}
