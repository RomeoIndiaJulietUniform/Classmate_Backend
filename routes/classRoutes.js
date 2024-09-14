const express = require('express');
const router = express.Router();
const Class = require('../models/class');
const User = require('../models/user');

// Helper function to log and handle errors
function handleError(res, status, message) {
  console.error(message);
  res.status(status).json({ message });
}

// Route to book a class
router.post('/classes/:classId/book', async (req, res) => {
  const { userId } = req.body;
  const { classId } = req.params;

  console.log(`Booking request - classId: ${classId}, userId: ${userId}`);

  try {
    const classDoc = await Class.findById(classId).populate('slots').populate('waitingList');
    const user = await User.findById(userId);

    if (!classDoc) {
      return handleError(res, 404, `Class with ID ${classId} not found`);
    }

    if (!user) {
      return handleError(res, 404, `User with ID ${userId} not found`);
    }

    if (classDoc.slots.includes(user._id)) {
      return handleError(res, 400, 'User already booked this class');
    }

    if (classDoc.slots.length < classDoc.capacity) {
      classDoc.slots.push(user._id);
      await classDoc.save();
      return res.status(200).json({ message: 'Slot booked successfully' });
    } else {
      if (!classDoc.waitingList.includes(user._id)) {
        classDoc.waitingList.push(user._id);
        await classDoc.save();
        return res.status(200).json({ message: 'Added to waiting list' });
      } else {
        return handleError(res, 400, 'User is already on the waiting list');
      }
    }
  } catch (error) {
    handleError(res, 500, error.message);
  }
});

// Route to cancel a class
router.post('/classes/:classId/cancel', async (req, res) => {
  const { userId } = req.body;
  const { classId } = req.params;

  console.log(`Cancellation request - classId: ${classId}, userId: ${userId}`);

  try {
    const classDoc = await Class.findById(classId).populate('slots').populate('waitingList');
    const user = await User.findById(userId);

    if (!classDoc) {
      return handleError(res, 404, `Class with ID ${classId} not found`);
    }

    if (!user) {
      return handleError(res, 404, `User with ID ${userId} not found`);
    }

    if (classDoc.slots.includes(user._id)) {
      const currentTime = new Date();
      const classTime = new Date(classDoc.startTime);
      const timeDifference = (classTime - currentTime) / (1000 * 60);

      if (timeDifference <= 30) {
        return handleError(res, 400, 'Cannot cancel within 30 minutes of the class start time');
      }

      classDoc.slots = classDoc.slots.filter(id => !id.equals(user._id));

      if (classDoc.waitingList.length > 0) {
        const nextUserId = classDoc.waitingList.shift();
        classDoc.slots.push(nextUserId);
      }

      await classDoc.save();
      return res.status(200).json({ message: 'Class canceled, slot reallocated from waitlist if applicable' });
    } else {
      return handleError(res, 400, 'User did not book this class');
    }
  } catch (error) {
    handleError(res, 500, error.message);
  }
});

// Route to get classes with filters and pagination
router.get('/classes', async (req, res) => {
  const { type, date, page = 1, limit = 100, sort = 'startTime' } = req.query;

  console.log(`Get classes request - type: ${type}, date: ${date}, page: ${page}, limit: ${limit}, sort: ${sort}`);

  try {
    const query = {};
    if (type) query.type = type;
    if (date) query.startTime = { $gte: new Date(date) };

    const skip = (page - 1) * limit;

    const classes = await Class.find(query)
      .sort({ [sort]: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('slots')
      .populate('waitingList');

    const totalClasses = await Class.countDocuments(query);

    return res.status(200).json({
      data: classes,
      total: totalClasses,
      page: parseInt(page),
      totalPages: Math.ceil(totalClasses / limit),
    });
  } catch (error) {
    handleError(res, 500, error.message);
  }
});

module.exports = router;
