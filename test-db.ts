import { db } from './src/db/index';
import { users } from './src/db/schema';
async function test() {
  try {
    const res = await db.select().from(users);
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
test();
