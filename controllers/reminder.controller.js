import Reminder from "../models/Reminder.model.js";

export const createReminder = async (req, res) => {
  try {
    const { type, title, description, scheduledDate, recurring } = req.body;

    if (!title || !scheduledDate) {
      return res.status(400).json({ message: "Title and scheduled date are required" });
    }

    const reminder = await Reminder.create({
      userId: req.user.id,
      type: type || "general",
      title,
      description,
      scheduledDate: new Date(scheduledDate),
      recurring: recurring || { enabled: false }
    });

    res.status(201).json(reminder);
  } catch (error) {
    res.status(500).json({ message: "Failed to create reminder" });
  }
};

export const getReminders = async (req, res) => {
  try {
    const { upcoming, completed } = req.query;
    const query = { userId: req.user.id };

    if (upcoming === "true") {
      query.isCompleted = false;
      query.scheduledDate = { $gte: new Date() };
    } else if (completed === "true") {
      query.isCompleted = true;
    }

    const reminders = await Reminder.find(query).sort({ scheduledDate: 1 });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reminders" });
  }
};

export const getReminderById = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.json(reminder);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reminder" });
  }
};

export const updateReminder = async (req, res) => {
  try {
    const { type, title, description, scheduledDate, isCompleted, recurring } = req.body;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        ...(type && { type }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
        ...(isCompleted !== undefined && { isCompleted }),
        ...(recurring && { recurring })
      },
      { returnDocument: "after" }
    );

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.json(reminder);
  } catch (error) {
    res.status(500).json({ message: "Failed to update reminder" });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.json({ message: "Reminder deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete reminder" });
  }
};

export const markComplete = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    reminder.isCompleted = true;

    if (reminder.recurring?.enabled) {
      const intervalMap = {
        daily: 1,
        weekly: 7,
        monthly: 30,
        yearly: 365
      };

      const daysToAdd = intervalMap[reminder.recurring.interval] || 30;
      const nextDate = new Date(reminder.scheduledDate);
      nextDate.setDate(nextDate.getDate() + daysToAdd);

      const newReminder = await Reminder.create({
        userId: reminder.userId,
        type: reminder.type,
        title: reminder.title,
        description: reminder.description,
        scheduledDate: nextDate,
        recurring: reminder.recurring
      });

      await reminder.save();
      return res.json({ completed: reminder, next: newReminder });
    }

    await reminder.save();
    res.json({ completed: reminder });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark reminder complete" });
  }
};
