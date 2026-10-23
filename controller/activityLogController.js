const ActivityLog = require("../models/activityLogModel");

const getActivityLog = async (req, res) => {
  try {
    const entries = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      data: entries,
      message: "Activity history fetched successfully.",
    });
  } catch (error) {
    console.error("Failed to fetch product activity history:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Activity history could not be loaded.",
    });
  }
};

module.exports = { getActivityLog };
