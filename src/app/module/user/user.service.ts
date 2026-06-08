import { HttpException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

type CreateUserFiles = {
  profilePicture?: Express.Multer.File;
  csvFile?: Express.Multer.File;
};

const userSearchAbleFields = [
  'fullName',
  'email',
  'role',
  'gender',
  'phoneNumber',
  'country',
  'city',
  'address',
  'postcode',
  'status',
];

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private getEmailsFromCsv(file: Express.Multer.File): string[] {
    if (!file?.buffer?.length) {
      throw new HttpException('No valid CSV file provided', 400);
    }

    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname?.toLowerCase().endsWith('.csv');

    if (!isCsv) {
      throw new HttpException('Only CSV files are allowed', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const lines = file.buffer
      .toString('utf8')
      .split(/\r?\n/)
      .map((value) => value.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);

    if (!lines.length || lines[0].toLowerCase() !== 'email') {
      throw new HttpException('CSV first row must be email', 400);
    }

    const emails = lines.slice(1).map((email) => email.toLowerCase());

    if (!emails.length) {
      throw new HttpException('CSV must contain at least one email', 400);
    }

    const invalidEmail = emails.find((email) => !emailRegex.test(email));
    if (invalidEmail) {
      throw new HttpException(`Invalid email in CSV: ${invalidEmail}`, 400);
    }

    return [...new Set(emails)];
  }

  async createUser(
    createUserDto: CreateUserDto,
    files?: CreateUserFiles | Express.Multer.File,
  ) {
    const payload = Object.fromEntries(
      Object.entries(createUserDto).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as CreateUserDto;

    const profilePicture =
      files && 'buffer' in files ? files : files?.profilePicture;
    const csvFile = files && 'buffer' in files ? undefined : files?.csvFile;

    if (csvFile) {
      const emails = this.getEmailsFromCsv(csvFile);
      const existingUsers = await this.userModel
        .find({ email: { $in: emails } })
        .select('email');
      const existingEmails = new Set(
        existingUsers.map((user) => user.email.toLowerCase()),
      );
      const users = emails
        .filter((email) => !existingEmails.has(email))
        .map((email) => ({
          ...payload,
          email,
          fullName: payload.fullName || email.split('@')[0],
        }));

      if (!users.length) {
        throw new HttpException('All CSV users already exist', 400);
      }

      return this.userModel.insertMany(users);
    }

    if (!payload.email) {
      throw new HttpException('Email is required', 400);
    }

    if (!payload.fullName) {
      throw new HttpException('Full name is required', 400);
    }

    const user = await this.userModel.findOne({ email: payload.email });
    if (user) {
      throw new HttpException('User already exists', 400);
    }
    if (profilePicture) {
      const uploadedFile = await fileUpload.uploadToCloudinary(profilePicture);
      payload.profilePicture = uploadedFile.url;
    }

    const createdUser = await this.userModel.create(payload);
    return createdUser;
  }

  async getAllUser(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params, userSearchAbleFields);

    const total = await this.userModel.countDocuments(whereConditions);
    const users = await this.userModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: users,
    };
  }

  async getSingleUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return user;
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (file) {
      const uploadedFile = await fileUpload.uploadToCloudinary(file);
      updateUserDto.profilePicture = uploadedFile.url;
    }
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      updateUserDto,
      { new: true },
    );
    return updatedUser;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    const result = await this.userModel.findByIdAndDelete(id);
    return result;
  }

  async getProfile(id: string) {
    const result = await this.userModel.findById(id);
    if (!result) {
      throw new HttpException('User not found', 404);
    }
    return result;
  }

  async updateMyProfile(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (file) {
      const uploadedFile = await fileUpload.uploadToCloudinary(file);
      updateUserDto.profilePicture = uploadedFile.url;
    }
    const result = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });
    return result;
  }
}
