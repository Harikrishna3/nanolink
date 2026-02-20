export class Url {
  id: BigInt;
  shortCode: string;
  longUrl: string;
  clicks: number;
  createdAt: Date;
  expiresAt: Date | null;
  userID:string
}