import { Router } from 'express';
import admin from 'firebase-admin';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 * Регистрация дополнительных данных пользователя в Firestore
 */
router.post('/register', authenticateUser, async (req, res) => {
  try {
    const { displayName, photoURL } = req.body;
    const userId = req.user.uid;

    // Обновляем профиль в Firebase Auth
    await admin.auth().updateUser(userId, {
      displayName: displayName || req.user.email?.split('@')[0],
      photoURL: photoURL || null
    });

    // Создаём/обновляем документ пользователя в Firestore
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        email: req.user.email,
        displayName: displayName || req.user.email?.split('@')[0],
        photoURL: photoURL || null,
        createdAt: new Date(),
        ideasCount: 0,
        isPremium: false,
        settings: {
          theme: 'dark',
          language: 'ru',
          notifications: true
        }
      });
    } else {
      await userRef.update({
        displayName: displayName || userDoc.data().displayName,
        photoURL: photoURL || userDoc.data().photoURL,
        updatedAt: new Date()
      });
    }

    const userData = (await userRef.get()).data();

    res.json({
      message: 'Профиль создан/обновлён',
      user: {
        uid: userId,
        email: req.user.email,
        ...userData
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка при создании профиля' });
  }
});

/**
 * GET /api/auth/profile
 * Получить профиль текущего пользователя
 */
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const userRef = admin.firestore().collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Профиль не найден' });
    }

    const userData = userDoc.data();

    // Получаем количество идей
    const ideasSnapshot = await admin.firestore()
      .collection('ideas')
      .where('userId', '==', req.user.uid)
      .count()
      .get();

    res.json({
      user: {
        uid: req.user.uid,
        email: req.user.email,
        ...userData,
        ideasCount: ideasSnapshot.data().count
      }
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/auth/profile
 * Обновить профиль пользователя
 */
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { displayName, photoURL, settings } = req.body;
    const updates = { updatedAt: new Date() };

    if (displayName) updates.displayName = displayName;
    if (photoURL) updates.photoURL = photoURL;
    if (settings) updates.settings = settings;

    const userRef = admin.firestore().collection('users').doc(req.user.uid);
    await userRef.update(updates);

    const updatedUser = (await userRef.get()).data();

    res.json({
      message: 'Профиль обновлён',
      user: {
        uid: req.user.uid,
        email: req.user.email,
        ...updatedUser
      }
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * DELETE /api/auth/account
 * Удалить аккаунт пользователя
 */
router.delete('/account', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Удаляем все идеи пользователя
    const ideasSnapshot = await admin.firestore()
      .collection('ideas')
      .where('userId', '==', userId)
      .get();

    const batch = admin.firestore().batch();
    ideasSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Удаляем профиль
    const userRef = admin.firestore().collection('users').doc(userId);
    batch.delete(userRef);

    await batch.commit();

    // Удаляем из Firebase Auth
    await admin.auth().deleteUser(userId);

    res.json({ message: 'Аккаунт успешно удалён' });
  } catch (error) {
    console.error('Ошибка удаления аккаунта:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/auth/refresh
 * Обновить кастомные claims (например, premium статус)
 */
router.post('/refresh', authenticateUser, async (req, res) => {
  try {
    const userRef = admin.firestore().collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // Устанавливаем кастомные claims
    await admin.auth().setCustomUserClaims(req.user.uid, {
      isPremium: userData?.isPremium || false,
      role: userData?.role || 'user'
    });

    res.json({ message: 'Claims обновлены' });
  } catch (error) {
    console.error('Ошибка обновления claims:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/auth/verify
 * Проверить валидность токена (для фронтенда)
 */
router.get('/verify', authenticateUser, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

export default router;