import { db } from '../server.js';

const IDEAS_COLLECTION = 'ideas';

export const IdeaModel = {
  async create(userId, ideaData) {
    const docRef = db.collection(IDEAS_COLLECTION).doc();
    const idea = {
      id: docRef.id,
      userId,
      title: ideaData.title,
      description: ideaData.description || '',
      arguments: {
        pro: ideaData.pro || [],
        con: ideaData.con || []
      },
      verdict: 'uncertain',
      score: 0,
      isPublic: ideaData.isPublic || false,
      sharedWith: ideaData.sharedWith || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await docRef.set(idea);
    return idea;
  },

  async getById(ideaId) {
    const doc = await db.collection(IDEAS_COLLECTION).doc(ideaId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async getUserIdeas(userId) {
    const snapshot = await db
      .collection(IDEAS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async update(ideaId, updates) {
    const docRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    await docRef.update({
      ...updates,
      updatedAt: new Date()
    });
    return this.getById(ideaId);
  },

  async delete(ideaId) {
    await db.collection(IDEAS_COLLECTION).doc(ideaId).delete();
  },

  async addArgument(ideaId, type, argument) {
    const idea = await this.getById(ideaId);
    if (!idea) throw new Error('Идея не найдена');
    
    const newArg = {
      id: Date.now().toString(),
      text: argument.text,
      authorId: argument.authorId,
      votes: 0,
      createdAt: new Date()
    };
    
    idea.arguments[type].push(newArg);
    return this.update(ideaId, { arguments: idea.arguments });
  }
};