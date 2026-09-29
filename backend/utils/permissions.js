// Small shared helpers for checking a user's relationship to a project.
// Accepts either a populated project (owner/members as objects with _id)
// or an unpopulated one (owner/members as raw ObjectIds) and normalizes
// everything to strings before comparing.

const idOf = (value) => {
  if (value == null) return '';
  return (value._id ? value._id : value).toString();
};

const isOwner = (project, userId) => {
  return idOf(project.owner) === idOf(userId);
};

const isMember = (project, userId) => {
  return (project.members || []).some((m) => idOf(m) === idOf(userId));
};

const hasProjectAccess = (project, userId) => {
  return isOwner(project, userId) || isMember(project, userId);
};

module.exports = { idOf, isOwner, isMember, hasProjectAccess };
