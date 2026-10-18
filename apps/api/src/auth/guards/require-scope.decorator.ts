import { SetMetadata } from "@nestjs/common";

export const REQUIRE_SCOPE_KEY = "requireScope";

export const RequireScope = (scope: string) => SetMetadata(REQUIRE_SCOPE_KEY, scope);
