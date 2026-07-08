import mongoose from 'mongoose';
import User from '../models/User';
import Resource from '../models/Resource';
import ExchangeRequest from '../models/ExchangeRequest';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookbridge';

async function test() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  try {
    // 1. Cleanup or setup test users
    let userA = await User.findOne({ email: 'usera@test.com' });
    if (!userA) {
      userA = await User.create({
        name: 'User A',
        email: 'usera@test.com',
        password: 'password123',
        isVerified: true,
        department: 'Computer Science & Engineering',
        semester: 4,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=usera'
      });
    }

    let userB = await User.findOne({ email: 'userb@test.com' });
    if (!userB) {
      userB = await User.create({
        name: 'User B',
        email: 'userb@test.com',
        password: 'password123',
        isVerified: true,
        department: 'Information Technology',
        semester: 4,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=userb'
      });
    }

    // Cleanup previous test resources
    await Resource.deleteMany({ owner: { $in: [userA._id, userB._id] } });
    await ExchangeRequest.deleteMany({ requester: { $in: [userA._id, userB._id] } });

    // 2. Create books
    const bookA = await Resource.create({
      title: 'Book A (User A)',
      author: 'Author A',
      description: 'Test book A',
      resourceType: 'Textbook',
      department: 'Computer Science & Engineering',
      semester: 4,
      courseCode: 'CS401',
      condition: 'Good',
      exchangeType: 'Exchange',
      price: 0,
      owner: userA._id,
      status: 'Available'
    });

    const bookB = await Resource.create({
      title: 'Book B (User B)',
      author: 'Author B',
      description: 'Test book B',
      resourceType: 'Textbook',
      department: 'Information Technology',
      semester: 4,
      courseCode: 'IT401',
      condition: 'Good',
      exchangeType: 'Exchange',
      price: 0,
      owner: userB._id,
      status: 'Available'
    });

    console.log("Created test resources.");

    // 3. Create Exchange Request (User B requests Book A from User A, offering Book B)
    const request = await ExchangeRequest.create({
      requester: userB._id,
      receiver: userA._id,
      requestedBook: bookA._id,
      offeredBook: bookB._id,
      message: 'Exchange test message',
      status: 'Pending'
    });
    console.log("Created exchange request. Status: Pending.");

    // Assert initial statuses
    if (bookA.status !== 'Available' || bookB.status !== 'Available') {
      throw new Error("Books should be Available initially");
    }

    // 4. Simulate Seller (User A) Accepting the request
    request.status = 'Accepted';
    await request.save();

    bookA.status = 'Reserved';
    await bookA.save();

    bookB.status = 'Reserved';
    await bookB.save();

    console.log("Accepted request. Book statuses set to Reserved.");

    // Verify status updates
    const updatedBookA = await Resource.findById(bookA._id);
    const updatedBookB = await Resource.findById(bookB._id);
    if (updatedBookA?.status !== 'Reserved' || updatedBookB?.status !== 'Reserved') {
      throw new Error("Book status update failed");
    }

    // 5. Simulate Complete Exchange
    request.status = 'Completed';
    await request.save();

    updatedBookA.status = 'Exchanged';
    await updatedBookA.save();

    updatedBookB.status = 'Exchanged';
    await updatedBookB.save();

    console.log("Completed request. Book statuses set to Exchanged.");

    const finalBookA = await Resource.findById(bookA._id);
    const finalBookB = await Resource.findById(bookB._id);
    if (finalBookA?.status !== 'Exchanged' || finalBookB?.status !== 'Exchanged') {
      throw new Error("Book status final update failed");
    }

    console.log("All database assertions passed successfully!");
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await mongoose.connection.close();
  }
}

test();
