const { ObjectId } = require('mongodb');
const { getMongoCollection } = require('./mongodb');
const collectionName = "volunteer";

async function findVolunteerInfo(username) {
  const collection = await getMongoCollection(collectionName);
  const volunteerInfo = await collection.aggregate([
        {
          $match: {
            username: username
          }
        },
        {
          $lookup: {
            from: "application",
            localField: "_id",
            foreignField: "volunteer_id",
            as: "applications",
          },
        },
        {
          $unwind: {
            path: "$applications",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "institution",
            localField: "applications.institution_id",
            foreignField: "_id",
            as: "institution_info",
          },
        },
        {
          $unwind: {
            path: "$institution_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "project",
            localField: "applications.project_id",
            foreignField: "_id",
            as: "projects",
          },
        },
        {
          $group: {
            _id: "$_id",
            count: {
              $sum: {
                $cond: [
                  { $eq: ["$applications", null] },
                  0,
                  { $size: "$projects" },
                ],
              },
            },
            volunteer_info: {
              $first: {
                _id: "$_id",
                username: "$username",
                password: "$password",
                name: "$name",
                age: "$age",
                gender: "$gender",
                job: "$job",
                email: "$email",
                phone: "$phone"
              },
            },
            projects: { $addToSet: "$projects" },
            institution_info: {
              $first: "$institution_info",
            },
          },
        },
        {
          $unwind: {
            path: "$volunteer_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: "$volunteer_info._id",
            count: "$count",
            volunteer_info: {
              $cond: [
                { $eq: ["$count", 0] },
                {
                  _id: "$volunteer_info._id",
                  name: "$volunteer_info.name",
                  username: "$volunteer_info.username",
                  password: "$volunteer_info.password",
                  age: "$volunteer_info.age",
                  gender: "$volunteer_info.gender",
                  job: "$volunteer_info.job",
                  email: "$volunteer_info.email",
                  phone: "$volunteer_info.phone"
                },
                "$volunteer_info",
              ],
            },
            projects: {
              $cond: [
                { $eq: ["$count", 0] },
                [],
                {
                  $map: {
                    input: "$projects",
                    as: "project",
                    in: {
                      $mergeObjects: [
                        {
                          $arrayElemAt: [
                            "$$project",
                            0,
                          ],
                        },
                        {
                          institution_info: {
                            _id: "$institution_info._id",
                            name: "$institution_info.name",
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ]
    ).toArray();

  return volunteerInfo;
};

module.exports = { findVolunteerInfo };