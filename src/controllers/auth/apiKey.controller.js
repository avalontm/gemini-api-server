// src/controllers/auth/apiKey.controller.js

const User = require('../../models/User.model');
const geminiApiKeyService = require('../../services/gemini/geminiApiKey.service');
const { validationResult } = require('express-validator');

/**
 * Obtener informacion de la API key del usuario
 */
const getApiKeyInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('+geminiApiKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    let apiKeyInfo = null;
    
    if (user.geminiApiKey) {
      const decryptedKey = user.decryptApiKey(user.geminiApiKey);
      if (decryptedKey) {
        apiKeyInfo = geminiApiKeyService.getApiKeyInfo(decryptedKey);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        hasApiKey: !!user.geminiApiKey,
        isActive: user.geminiApiKeyStatus.isActive,
        isUsingPersonalKey: user.preferences.usePersonalApiKey,
        lastValidated: user.geminiApiKeyStatus.lastValidated,
        lastError: user.geminiApiKeyStatus.lastError,
        apiKeyInfo: apiKeyInfo,
        serverApiKeyAvailable: geminiApiKeyService.hasServerApiKey()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Configurar o actualizar API key personal
 */
const setApiKey = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'API key es requerida'
      });
    }

    const trimmedApiKey = apiKey.trim();

    // Validar la API key con Gemini
    const validation = await geminiApiKeyService.validateApiKey(trimmedApiKey);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'API key invalida',
        error: validation.error,
        details: validation.details
      });
    }

    // Obtener usuario con API key actual
    const user = await User.findById(userId).select('+geminiApiKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Encriptar manualmente la API key
    const encryptedKey = user.encryptApiKey(trimmedApiKey);
    
    // Actualizar usando updateOne para evitar validación de todo el documento
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          geminiApiKey: encryptedKey,
          'geminiApiKeyStatus.isActive': true,
          'geminiApiKeyStatus.lastValidated': new Date(),
          'geminiApiKeyStatus.lastError': null,
          'preferences.usePersonalApiKey': true
        }
      }
    );

    const apiKeyInfo = geminiApiKeyService.getApiKeyInfo(trimmedApiKey);

    res.status(200).json({
      success: true,
      message: 'API key configurada exitosamente',
      data: {
        apiKeyInfo: apiKeyInfo,
        isActive: true,
        isUsingPersonalKey: true,
        lastValidated: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validar API key personal existente
 */
const validateApiKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('+geminiApiKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (!user.geminiApiKey) {
      return res.status(400).json({
        success: false,
        message: 'No hay API key configurada'
      });
    }

    const decryptedKey = user.decryptApiKey(user.geminiApiKey);

    if (!decryptedKey) {
      return res.status(500).json({
        success: false,
        message: 'Error al desencriptar API key'
      });
    }

    // Validar la API key con Gemini
    const validation = await geminiApiKeyService.validateApiKey(decryptedKey);

    // Actualizar estado de la API key usando updateOne
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'geminiApiKeyStatus.isActive': validation.isValid,
          'geminiApiKeyStatus.lastValidated': new Date(),
          'geminiApiKeyStatus.lastError': validation.isValid ? null : validation.error
        }
      }
    );

    res.status(200).json({
      success: true,
      data: {
        isValid: validation.isValid,
        message: validation.message || validation.error,
        lastValidated: new Date(),
        model: validation.model
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activar o desactivar uso de API key personal
 */
const toggleApiKeyUsage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { usePersonalApiKey } = req.body;

    if (typeof usePersonalApiKey !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'usePersonalApiKey debe ser un booleano'
      });
    }

    const user = await User.findById(userId).select('+geminiApiKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si quiere activar pero no tiene API key
    if (usePersonalApiKey && !user.geminiApiKey) {
      return res.status(400).json({
        success: false,
        message: 'No hay API key configurada. Configure una API key primero'
      });
    }

    // Si quiere activar pero la API key no esta activa
    if (usePersonalApiKey && !user.geminiApiKeyStatus.isActive) {
      return res.status(400).json({
        success: false,
        message: 'La API key no esta activa. Valide la API key primero'
      });
    }

    // Actualizar usando updateOne
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'preferences.usePersonalApiKey': usePersonalApiKey
        }
      }
    );

    res.status(200).json({
      success: true,
      message: usePersonalApiKey 
        ? 'Ahora se usara tu API key personal' 
        : 'Ahora se usara la API key del servidor',
      data: {
        usePersonalApiKey: usePersonalApiKey,
        hasApiKey: !!user.geminiApiKey,
        isActive: user.geminiApiKeyStatus.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar API key personal
 */
const deleteApiKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('+geminiApiKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (!user.geminiApiKey) {
      return res.status(400).json({
        success: false,
        message: 'No hay API key configurada'
      });
    }

    // Limpiar API key y estado usando updateOne
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          geminiApiKey: null,
          'geminiApiKeyStatus.isActive': false,
          'geminiApiKeyStatus.lastValidated': null,
          'geminiApiKeyStatus.lastError': null,
          'preferences.usePersonalApiKey': false
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'API key eliminada exitosamente',
      data: {
        hasApiKey: false,
        isActive: false,
        usePersonalApiKey: false
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadisticas de uso de API key
 */
const getApiKeyStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('+geminiApiKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const isUsingPersonal = user.hasPersonalApiKey();
    const hasServerKey = geminiApiKeyService.hasServerApiKey();

    const stats = {
      currentMode: isUsingPersonal ? 'personal' : 'servidor',
      hasPersonalKey: !!user.geminiApiKey,
      personalKeyActive: user.geminiApiKeyStatus.isActive,
      hasServerKey: hasServerKey,
      canUseService: isUsingPersonal || hasServerKey,
      lastValidated: user.geminiApiKeyStatus.lastValidated,
      lastError: user.geminiApiKeyStatus.lastError
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar preferencias relacionadas con API key
 */
const updateApiKeyPreferences = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { usePersonalApiKey } = req.body;

    const user = await User.findById(userId).select('+geminiApiKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (usePersonalApiKey !== undefined) {
      if (typeof usePersonalApiKey !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'usePersonalApiKey debe ser un booleano'
        });
      }

      if (usePersonalApiKey && !user.geminiApiKey) {
        return res.status(400).json({
          success: false,
          message: 'No se puede activar: No hay API key configurada'
        });
      }

      if (usePersonalApiKey && !user.geminiApiKeyStatus.isActive) {
        return res.status(400).json({
          success: false,
          message: 'No se puede activar: La API key no esta validada'
        });
      }

      // Actualizar usando updateOne
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            'preferences.usePersonalApiKey': usePersonalApiKey
          }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Preferencias actualizadas',
      data: {
        preferences: {
          usePersonalApiKey: usePersonalApiKey
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApiKeyInfo,
  setApiKey,
  validateApiKey,
  toggleApiKeyUsage,
  deleteApiKey,
  getApiKeyStats,
  updateApiKeyPreferences
};