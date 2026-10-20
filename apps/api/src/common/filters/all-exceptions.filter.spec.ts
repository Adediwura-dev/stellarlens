import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
  Logger,
  Module,
  NotFoundException
} from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AllExceptionsFilter } from "./all-exceptions.filter";

@Controller("errors")
class ErrorsController {
  @Get("known")
  known(): never {
    throw new NotFoundException("missing");
  }

  @Get("validation")
  validation(): never {
    throw new BadRequestException({
      message: ["name must be a string", "amount must be positive"],
      error: "Bad Request"
    });
  }

  @Get("unexpected")
  unexpected(): never {
    throw new Error("boom: database password leaked");
  }
}

@Module({
  controllers: [ErrorsController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }]
})
class ErrorsModule {}

describe("AllExceptionsFilter", () => {
  let app: INestApplication;

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [ErrorsModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it("preserves the status code and message of a known HttpException", async () => {
    const response = await request(app.getHttpServer()).get("/errors/known").expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      message: "missing",
      error: "Not Found"
    });
  });

  it("preserves array validation messages from an HttpException", async () => {
    const response = await request(app.getHttpServer()).get("/errors/validation").expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: ["name must be a string", "amount must be positive"],
      error: "Bad Request"
    });
  });

  it("normalizes unexpected errors to a generic 500 without leaking details", async () => {
    const response = await request(app.getHttpServer()).get("/errors/unexpected").expect(500);

    expect(response.body).toEqual({
      statusCode: 500,
      message: "Internal server error",
      error: "Internal Server Error"
    });
    expect(JSON.stringify(response.body)).not.toContain("boom");
  });
});
