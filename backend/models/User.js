import { db } from '../server.js';

const USERS_COLLECTION = 'users';

export const UserModel = {
  /**
   * Создать или обновить пользователя
   */
  async createOrUpdate(uid, userData) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    const doc = await docRef.get();

    const user = {
      uid,
      email: userData.email || '',
      displayName: userData.displayName || 'Аноним',
      photoURL: userData.photoURL || '',
      emailVerified: userData.emailVerified || false,
      provider: userData.provider || 'email',
      
      // Настройки
      settings: {
        theme: 'dark',
        language: 'ru',
        notifications: true,
      },
      
      // Статистика
      stats: {
        totalIdeas: 0,
        totalArguments: 0,
        ideasThisMonth: 0,
        lastActiveAt: new Date(),
      },
      
      // Подписка
      subscription: {
        plan: 'free', // free | pro | team | enterprise
        status: 'active', // active | cancelled | expired
        startedAt: new Date(),
        expiresAt: null,
        features: ['basic_validation', 'local_storage', 'export_txt'],
      },
      
      // Команды
      teamIds: [],
      
      // Временные метки
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (doc.exists) {
      // Обновляем существующего пользователя
      const existingData = doc.data();
      const updatedUser = {
        ...existingData,
        ...userData,
        'stats.lastActiveAt': new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(updatedUser, { merge: true });
      return { uid, ...updatedUser };
    } else {
      // Создаём нового
      await docRef.set(user);
      return user;
    }
  },

  /**
   * Получить пользователя по UID
   */
  async getById(uid) {
    const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
    if (!doc.exists) return null;
    return { uid: doc.id, ...doc.data() };
  },

  /**
   * Получить пользователя по email
   */
  async getByEmail(email) {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { uid: doc.id, ...doc.data() };
  },

  /**
   * Обновить профиль пользователя
   */
  async updateProfile(uid, updates) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    const allowedUpdates = [
      'displayName',
      'photoURL',
      'settings',
      'email',
    ];
    
    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }
    
    filteredUpdates.updatedAt = new Date();
    
    await docRef.set(filteredUpdates, { merge: true });
    return this.getById(uid);
  },

  /**
   * Обновить настройки
   */
  async updateSettings(uid, settings) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    await docRef.set(
      {
        settings: settings,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    return this.getById(uid);
  },

  /**
   * Обновить статистику
   */
  async updateStats(uid, stats) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    await docRef.set(
      {
        stats: stats,
        'stats.lastActiveAt': new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  },

  /**
   * Увеличить счётчик идей
   */
  async incrementIdeasCount(uid) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    await docRef.update({
      'stats.totalIdeas': admin.firestore.FieldValue.increment(1),
      'stats.ideasThisMonth': admin.firestore.FieldValue.increment(1),
      'stats.lastActiveAt': new Date(),
      updatedAt: new Date(),
    });
  },

  /**
   * Увеличить счётчик аргументов
   */
  async incrementArgumentsCount(uid, count = 1) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    await docRef.update({
      'stats.totalArguments': admin.firestore.FieldValue.increment(count),
      'stats.lastActiveAt': new Date(),
      updatedAt: new Date(),
    });
  },

  /**
   * Обновить подписку
   */
  async updateSubscription(uid, subscriptionData) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    
    const plans = {
      free: {
        limits: { maxIdeas: 10, maxArgumentsPerIdea: 20, aiAnalysis: false, exportFormats: ['txt'] },
        features: ['basic_validation', 'local_storage', 'export_txt'],
      },
      pro: {
        limits: { maxIdeas: 100, maxArgumentsPerIdea: 100, aiAnalysis: true, exportFormats: ['txt', 'json', 'pdf'] },
        features: ['basic_validation', 'cloud_storage', 'ai_analysis', 'export_all', 'priority_support'],
      },
      team: {
        limits: { maxIdeas: 500, maxArgumentsPerIdea: 200, aiAnalysis: true, exportFormats: ['txt', 'json', 'pdf', 'csv'] },
        features: ['all_pro', 'team_collaboration', 'shared_workspaces', 'admin_dashboard'],
      },
      enterprise: {
        limits: { maxIdeas: Infinity, maxArgumentsPerIdea: Infinity, aiAnalysis: true, exportFormats: ['all'] },
        features: ['all_team', 'custom_branding', 'sso', 'api_access', 'dedicated_support'],
      },
    };

    const plan = plans[subscriptionData.plan] || plans.free;
    
    await docRef.set(
      {
        subscription: {
          plan: subscriptionData.plan || 'free',
          status: subscriptionData.status || 'active',
          startedAt: subscriptionData.startedAt || new Date(),
          expiresAt: subscriptionData.expiresAt || null,
          limits: plan.limits,
          features: plan.features,
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );
    
    return this.getById(uid);
  },

  /**
   * Проверить лимиты пользователя
   */
  async checkLimits(uid) {
    const user = await this.getById(uid);
    if (!user) throw new Error('Пользователь не найден');
    
    const { limits } = user.subscription;
    const ideas = await db
      .collection('ideas')
      .where('userId', '==', uid)
      .get();
    
    return {
      currentIdeas: ideas.size,
      maxIdeas: limits.maxIdeas,
      canCreate: ideas.size < limits.maxIdeas,
      canUseAI: limits.aiAnalysis || false,
      features: user.subscription.features,
    };
  },

  /**
   * Добавить в команду
   */
  async addToTeam(uid, teamId) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    await docRef.update({
      teamIds: admin.firestore.FieldValue.arrayUnion(teamId),
      updatedAt: new Date(),
    });
  },

  /**
   * Удалить из команды
   */
  async removeFromTeam(uid, teamId) {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    await docRef.update({
      teamIds: admin.firestore.FieldValue.arrayRemove(teamId),
      updatedAt: new Date(),
    });
  },

  /**
   * Получить пользователей команды
   */
  async getTeamMembers(teamId) {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('teamIds', 'array-contains', teamId)
      .get();
    
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
  },

  /**
   * Удалить пользователя (GDPR)
   */
  async delete(uid) {
    // Удаляем все идеи пользователя
    const ideasSnapshot = await db
      .collection('ideas')
      .where('userId', '==', uid)
      .get();
    
    const batch = db.batch();
    ideasSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Удаляем пользователя
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    batch.delete(userRef);
    
    await batch.commit();
  },

  /**
   * Поиск пользователей
   */
  async search(query, limit = 10) {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('displayName', '>=', query)
      .where('displayName', '<=', query + '\uf8ff')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName,
      photoURL: doc.data().photoURL,
      email: doc.data().email,
    }));
  },

  /**
   * Получить активность пользователя
   */
  async getActivity(uid, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const ideas = await db
      .collection('ideas')
      .where('userId', '==', uid)
      .where('createdAt', '>=', since)
      .get();
    
    return {
      totalIdeas: ideas.size,
      recentIdeas: ideas.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        createdAt: doc.data().createdAt,
      })),
    };
  },

  /**
   * Экспорт данных пользователя (GDPR)
   */
  async exportData(uid) {
    const user = await this.getById(uid);
    if (!user) return null;
    
    const ideas = await db
      .collection('ideas')
      .where('userId', '==', uid)
      .get();
    
    return {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      ideas: ideas.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })),
      exportedAt: new Date().toISOString(),
    };
  },
};