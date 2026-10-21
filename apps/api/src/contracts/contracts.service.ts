import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { contracts, type Database } from "@stellarlens/db";
import { DATABASE } from "../database/database.module";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";

@Injectable()
export class ContractsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async register(dto: CreateContractDto) {
    const [contract] = await this.db
      .insert(contracts)
      .values({ address: dto.address, name: dto.name ?? null, network: dto.network })
      .onConflictDoUpdate({
        target: contracts.address,
        set: { name: dto.name ?? null, network: dto.network }
      })
      .returning();
    return contract;
  }

  findAll() {
    return this.db.select().from(contracts);
  }

  async findOne(id: number) {
    const [contract] = await this.db.select().from(contracts).where(eq(contracts.id, id));
    if (!contract) {
      throw new NotFoundException(`contract ${id} not found`);
    }
    return contract;
  }

  async update(id: number, dto: UpdateContractDto) {
    const values: { name?: string | null; network?: string } = {};
    if (dto.name !== undefined) {
      values.name = dto.name;
    }
    if (dto.network !== undefined) {
      values.network = dto.network;
    }

    if (Object.keys(values).length === 0) {
      return this.findOne(id);
    }

    const [contract] = await this.db
      .update(contracts)
      .set(values)
      .where(eq(contracts.id, id))
      .returning();

    if (!contract) {
      throw new NotFoundException(`contract ${id} not found`);
    }

    return contract;
  }
}
