// src/controllers/auth/logout.controller.js

const sessionService = require('../../services/auth/session.service');

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesion
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Sesion cerrada exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const logout = async (req, res, next) => {
  try {
    const token = req.token || req.cookies.token;
    const userId = req.user.id;

    if (token) {
      await sessionService.deleteSession(userId, token);
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Sesion cerrada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Cerrar todas las sesiones del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las sesiones cerradas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Todas las sesiones cerradas
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const logoutAll = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await sessionService.deleteAllUserSessions(userId);

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Todas las sesiones cerradas exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logout,
  logoutAll
};