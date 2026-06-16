import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }
  return secret || 'dev-secret-key-not-for-production';
}

function signToken(userId: string, expiresIn: string = '7d'): string {
  const options: jwt.SignOptions = { expiresIn } as jwt.SignOptions;
  return jwt.sign({ userId }, getJwtSecret(), options);
}

function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, getJwtSecret()) as { userId: string };
}

export { getJwtSecret, signToken, verifyToken };
