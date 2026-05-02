export const authenticateUser = async (req, res, next) => {
  // Временно пропускаем всех без проверки
  // TODO: добавить проверку Firebase токена
  req.user = {
    uid: 'test-user',
    email: 'test@example.com'
  };
  next();
};

export const optionalAuth = async (req, res, next) => {
  req.user = null;
  next();
};