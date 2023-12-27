import { Controller, Post, Body, HttpStatus, UseGuards, Req, Res, Query,Delete, Get,Param, Headers,DefaultValuePipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Login } from './request/login.dto';
import { LoginResponse } from './response/login.dto';
import { EmptyObject } from '../../shared/response/emptyObject.dto';
import { ApiResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LoginBase } from './response/loginBase.dto';
import { Causes } from '../../config/exception/causes';
import { EmptyObjectBase } from '../../shared/response/emptyObjectBase.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Register } from './request/register.dto';
import { RegisterResponse } from './response/register.dto';
import { RegisterBase } from './response/registerBase.dto';
import { UpdatePassword } from './request/update-password.dto';
import { TwoFactorAuthenticationService } from './twoFactorAuthentication.service';
import { Check2fa } from './request/check2fa.dto';
import { UsersService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { PaginationResponse } from 'src/config/rest/paginationResponse';
import { Admin} from '../../database/entities';
import RequestWithUser from './requestWithUser.interface';
@Controller('admin')
export class AuthController {
    constructor(
        private jwtService: JwtService,
        private readonly twoFactorAuthenticationService: TwoFactorAuthenticationService,
        private readonly usersService: UsersService,
        private authService: AuthService,
    ) { }

    @Get('is-first-user')
    async isFirstUser(@Headers() headers): Promise<any> {
        const token = headers.authorization ? headers.authorization : '';
        return this.authService.isFirstUser(token);
    }

    @Post('/register')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        tags: ['admin'],
        operationId: 'register',
        summary: 'Register',
        description: 'Register a new user',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: RegisterBase,
    })
    async register(@Body() data: Register, @Headers() headers, @Req() request: any): Promise<RegisterResponse | EmptyObject> {
        if (!request || !request.user) throw Causes.USER_NOT_ACCESS;
        console.log("Data request.user",request.user);
        const duplicatedUser = await this.authService.checkDuplicatedUser(data);
        if (duplicatedUser) {
            throw Causes.USER_NOT_ACCESS;
        }
        const user = await this.authService.registerUser(data);
        return user;
    }

    @Post('/register-first-user')
    @ApiOperation({
        tags: ['admin'],
        operationId: 'register',
        summary: 'Register',
        description: 'Register a new user',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: RegisterBase,
    })
    async registerFirstUser(@Body() data: Register, @Headers() headers): Promise<RegisterResponse | EmptyObject> {
        const token = headers.authorization ? headers.authorization : '';
        const isFirstUser = await this.authService.isFirstUser(token);

        if (!isFirstUser) throw Causes.NOT_ACCESS_CREATE_USER;

        const duplicatedUser = await this.authService.checkDuplicatedUser(data);
        if (duplicatedUser) {
            throw Causes.DUPLICATED_EMAIL_OR_USERNAME;
        }
        const user = await this.authService.registerUser(data);
        return user;
    }

    @Post('/gen-2fa')
    @ApiOperation({
        tags: ['admin'],
        operationId: 'check2fa',
        summary: 'Check2fa',
        description: 'Check2fa',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: EmptyObjectBase,
    })
    async check2fa(@Body() data: Check2fa): Promise<EmptyObject> {
        const user = await this.authService.validateUser(data);
        if (!user) {
            throw Causes.EMAIL_OR_PASSWORD_INVALID;
        }

        var secret = user.twoFactorAuthenticationSecret;
        if (!secret) {
            secret = await this.twoFactorAuthenticationService.generateTwoFactorAuthenticationSecret(user);
        }

        return {
            isActive2fa: user.isActive2fa,
            twoFactorAuthenticationSecret: this.jwtService.decode(secret)
        };
    }

    @Post('/login')
    @ApiOperation({
        tags: ['admin'],
        operationId: 'login',
        summary: 'Login',
        description: 'Login',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: LoginBase,
    })
    async login(@Body() data: Login): Promise<LoginResponse | EmptyObject> {
        const user = await this.authService.validateUser(data);
        if (!user) {
            throw Causes.EMAIL_OR_PASSWORD_INVALID;
        }

        let isActive = await this.authService.validateAdminActive(data.email);
        if(!isActive){
            throw Causes.EMAIL_OR_PASSWORD_INVALID;
        }
        console.log("isCodeValid",data.twofa );
        console.log("isCodeValid", user );
        const isCodeValid = await this.twoFactorAuthenticationService.isTwoFactorAuthenticationCodeValid(
            data.twofa, user
        );

        if (!isCodeValid) {
            throw Causes.TWOFA_INVALID;
        }

        if (!user.isActive2fa) {
            await this.usersService.turnOnTwoFactorAuthentication(user.id);
        }

        return this.authService.login(user);
    }

    @Post('/logout')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        tags: ['admin'],
        operationId: 'logout',
        summary: 'Logout',
        description: 'Logout',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: EmptyObjectBase,
    })
    async logout(@Req() request: any): Promise<EmptyObject> {
        const token = request.headers.authorization;
        this.authService.logout(token);
        return new EmptyObject();
    }


    @Post('/update-password')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        tags: ['admin'],
        operationId: 'update profile',
        summary: 'update profile',
        description: 'update profile',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: RegisterBase,
    })
    async updatePassword(@Body() data: UpdatePassword, @Req() request: RequestWithUser): Promise<any | EmptyObject> {
        if (!request || !request.user) throw Causes.USER_NOT_ACCESS;

        if (!data.oldPassword || !data.newPassword) throw Causes.DATA_INVALID;

        if (data.oldPassword === data.newPassword) throw Causes.DATA_INVALID;

        const user = request.user;
        const userUpdate = await this.authService.updatePassword(user, data);

        if (!userUpdate) throw Causes.DATA_INVALID;

        return userUpdate;
    }
   
    @Post('/update-admin')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        tags: ['admin'],
        operationId: 'update admin',
        summary: 'update admin',
        description: 'update admin',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: RegisterBase,
    })
    async updateProfileAdmin(@Body() data: any,@Req() request: RequestWithUser): Promise<any | EmptyObject> {
        if (!request || !request.user) throw Causes.USER_NOT_ACCESS;
        const userUpdate = await this.authService.updateProfileAdmin(data);

        if (!userUpdate) throw Causes.DATA_INVALID;

        return userUpdate;
    }

    @Delete('delete-admin/:id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        tags: ['admin'],
        operationId: 'Delete admin',
        summary: 'Delete admin',
        description: 'Delete admin',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: RegisterBase,
    })
    async deleteAdminById(@Param('id') id: string,@Req() request: RequestWithUser) {
        if (!request || !request.user) throw Causes.USER_NOT_ACCESS;
        return this.authService.deleteAdminById(+id);
    }
}
