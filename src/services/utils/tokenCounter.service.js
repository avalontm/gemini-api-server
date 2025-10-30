// src/services/utils/tokenCounter.service.js

class TokenCounterService {
  constructor() {
    this.pricing = {
      'gemini-1.5-flash': {
        input: 0.000075,
        output: 0.0003,
        per: 1000
      },
      'gemini-1.5-pro': {
        input: 0.00125,
        output: 0.005,
        per: 1000
      },
      'gemini-1.0-pro': {
        input: 0.0005,
        output: 0.0015,
        per: 1000
      }
    };

    this.currentModel = 'gemini-1.5-flash';
  }

  /**
   * Estima cantidad de tokens en un texto
   * @param {string} text - Texto a analizar
   * @returns {number} - Cantidad estimada de tokens
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    const words = text.trim().split(/\s+/).length;
    const characters = text.length;

    const tokensByWords = Math.ceil(words * 1.3);
    const tokensByChars = Math.ceil(characters / 4);

    return Math.max(tokensByWords, tokensByChars);
  }

  /**
   * Calcula costo de tokens
   * @param {Object} tokens - Informacion de tokens
   * @param {number} tokens.input - Tokens de entrada
   * @param {number} tokens.output - Tokens de salida
   * @param {string} model - Modelo utilizado (opcional)
   * @returns {Object} - Informacion de costo
   */
  calculateCost(tokens, model = null) {
    try {
      const modelName = model || this.currentModel;
      const pricing = this.pricing[modelName];

      if (!pricing) {
        throw new Error(`Modelo no encontrado en pricing: ${modelName}`);
      }

      const inputCost = (tokens.input / pricing.per) * pricing.input;
      const outputCost = (tokens.output / pricing.per) * pricing.output;
      const totalCost = inputCost + outputCost;

      return {
        input: {
          tokens: tokens.input,
          cost: this.formatCost(inputCost)
        },
        output: {
          tokens: tokens.output,
          cost: this.formatCost(outputCost)
        },
        total: {
          tokens: tokens.input + tokens.output,
          cost: this.formatCost(totalCost)
        },
        model: modelName,
        currency: 'USD'
      };
    } catch (error) {
      throw new Error(`Error calculando costo: ${error.message}`);
    }
  }

  /**
   * Estima costo de un texto
   * @param {string} text - Texto a analizar
   * @param {string} type - Tipo (input o output)
   * @param {string} model - Modelo a usar (opcional)
   * @returns {Object} - Informacion de costo estimado
   */
  estimateCost(text, type = 'input', model = null) {
    try {
      const tokens = this.estimateTokens(text);
      const modelName = model || this.currentModel;
      const pricing = this.pricing[modelName];

      if (!pricing) {
        throw new Error(`Modelo no encontrado en pricing: ${modelName}`);
      }

      const costPerToken = type === 'input' ? pricing.input : pricing.output;
      const cost = (tokens / pricing.per) * costPerToken;

      return {
        tokens,
        cost: this.formatCost(cost),
        costPerToken: costPerToken / pricing.per,
        type,
        model: modelName,
        currency: 'USD'
      };
    } catch (error) {
      throw new Error(`Error estimando costo: ${error.message}`);
    }
  }

  /**
   * Formatea costo a numero con precision
   * @param {number} cost - Costo a formatear
   * @returns {number} - Costo formateado
   */
  formatCost(cost) {
    return Math.round(cost * 1000000) / 1000000;
  }

  /**
   * Formatea costo a string con simbolo de moneda
   * @param {number} cost - Costo a formatear
   * @returns {string} - Costo formateado con simbolo
   */
  formatCostToString(cost) {
    if (cost < 0.000001) {
      return '$0.000001';
    }
    return `$${this.formatCost(cost)}`;
  }

  /**
   * Obtiene informacion de un modelo
   * @param {string} modelName - Nombre del modelo
   * @returns {Object} - Informacion del modelo
   */
  getModelInfo(modelName) {
    const pricing = this.pricing[modelName];

    if (!pricing) {
      throw new Error(`Modelo no encontrado: ${modelName}`);
    }

    return {
      model: modelName,
      pricing: {
        input: `${this.formatCostToString(pricing.input)} per ${pricing.per} tokens`,
        output: `${this.formatCostToString(pricing.output)} per ${pricing.per} tokens`
      },
      inputCostPerToken: pricing.input / pricing.per,
      outputCostPerToken: pricing.output / pricing.per
    };
  }

  /**
   * Lista todos los modelos disponibles
   * @returns {Array} - Array de nombres de modelos
   */
  listModels() {
    return Object.keys(this.pricing);
  }

  /**
   * Compara costos entre modelos
   * @param {Object} tokens - Tokens a comparar
   * @param {number} tokens.input - Tokens de entrada
   * @param {number} tokens.output - Tokens de salida
   * @returns {Array} - Comparacion de costos por modelo
   */
  compareModelCosts(tokens) {
    const models = this.listModels();
    const comparison = [];

    for (const model of models) {
      const cost = this.calculateCost(tokens, model);
      comparison.push({
        model,
        totalCost: cost.total.cost,
        totalCostFormatted: this.formatCostToString(cost.total.cost)
      });
    }

    comparison.sort((a, b) => a.totalCost - b.totalCost);

    return comparison;
  }

  /**
   * Calcula ahorro al usar un modelo vs otro
   * @param {Object} tokens - Tokens utilizados
   * @param {string} model1 - Primer modelo
   * @param {string} model2 - Segundo modelo
   * @returns {Object} - Informacion de ahorro
   */
  calculateSavings(tokens, model1, model2) {
    try {
      const cost1 = this.calculateCost(tokens, model1);
      const cost2 = this.calculateCost(tokens, model2);

      const difference = cost1.total.cost - cost2.total.cost;
      const percentageSaved = (difference / cost1.total.cost) * 100;

      return {
        model1: {
          name: model1,
          cost: cost1.total.cost,
          costFormatted: this.formatCostToString(cost1.total.cost)
        },
        model2: {
          name: model2,
          cost: cost2.total.cost,
          costFormatted: this.formatCostToString(cost2.total.cost)
        },
        savings: {
          amount: Math.abs(difference),
          amountFormatted: this.formatCostToString(Math.abs(difference)),
          percentage: Math.abs(percentageSaved).toFixed(2) + '%',
          cheaperModel: difference > 0 ? model2 : model1
        }
      };
    } catch (error) {
      throw new Error(`Error calculando ahorro: ${error.message}`);
    }
  }

  /**
   * Estima tokens para una conversacion completa
   * @param {Array} messages - Array de mensajes
   * @returns {Object} - Estimacion de tokens
   */
  estimateConversationTokens(messages) {
    try {
      let totalInput = 0;
      let totalOutput = 0;

      for (const message of messages) {
        const tokens = this.estimateTokens(message.content);

        if (message.role === 'user') {
          totalInput += tokens;
        } else if (message.role === 'assistant') {
          totalOutput += tokens;
        }
      }

      return {
        input: totalInput,
        output: totalOutput,
        total: totalInput + totalOutput,
        messages: messages.length
      };
    } catch (error) {
      throw new Error(`Error estimando tokens de conversacion: ${error.message}`);
    }
  }

  /**
   * Calcula costo de una conversacion
   * @param {Array} messages - Array de mensajes
   * @param {string} model - Modelo utilizado (opcional)
   * @returns {Object} - Informacion de costo
   */
  calculateConversationCost(messages, model = null) {
    try {
      const tokens = this.estimateConversationTokens(messages);
      return this.calculateCost(tokens, model);
    } catch (error) {
      throw new Error(`Error calculando costo de conversacion: ${error.message}`);
    }
  }

  /**
   * Estima costo mensual basado en uso diario
   * @param {number} dailyTokens - Tokens usados por dia
   * @param {string} model - Modelo utilizado (opcional)
   * @returns {Object} - Estimacion mensual
   */
  estimateMonthlyCost(dailyTokens, model = null) {
    try {
      const modelName = model || this.currentModel;
      const pricing = this.pricing[modelName];

      if (!pricing) {
        throw new Error(`Modelo no encontrado: ${modelName}`);
      }

      const dailyCost = (dailyTokens / pricing.per) * pricing.input;
      const weeklyCost = dailyCost * 7;
      const monthlyCost = dailyCost * 30;
      const yearlyCost = dailyCost * 365;

      return {
        daily: {
          tokens: dailyTokens,
          cost: this.formatCost(dailyCost),
          costFormatted: this.formatCostToString(dailyCost)
        },
        weekly: {
          tokens: dailyTokens * 7,
          cost: this.formatCost(weeklyCost),
          costFormatted: this.formatCostToString(weeklyCost)
        },
        monthly: {
          tokens: dailyTokens * 30,
          cost: this.formatCost(monthlyCost),
          costFormatted: this.formatCostToString(monthlyCost)
        },
        yearly: {
          tokens: dailyTokens * 365,
          cost: this.formatCost(yearlyCost),
          costFormatted: this.formatCostToString(yearlyCost)
        },
        model: modelName
      };
    } catch (error) {
      throw new Error(`Error estimando costo mensual: ${error.message}`);
    }
  }

  /**
   * Calcula tokens por dollar
   * @param {number} dollars - Cantidad en dolares
   * @param {string} type - Tipo (input o output)
   * @param {string} model - Modelo (opcional)
   * @returns {Object} - Cantidad de tokens
   */
  calculateTokensPerDollar(dollars, type = 'input', model = null) {
    try {
      const modelName = model || this.currentModel;
      const pricing = this.pricing[modelName];

      if (!pricing) {
        throw new Error(`Modelo no encontrado: ${modelName}`);
      }

      const costPerToken = type === 'input' ? pricing.input : pricing.output;
      const tokens = (dollars / costPerToken) * pricing.per;

      return {
        dollars,
        tokens: Math.floor(tokens),
        type,
        model: modelName,
        estimatedWords: Math.floor(tokens / 1.3),
        estimatedCharacters: Math.floor(tokens * 4)
      };
    } catch (error) {
      throw new Error(`Error calculando tokens por dollar: ${error.message}`);
    }
  }

  /**
   * Actualiza modelo actual
   * @param {string} modelName - Nombre del modelo
   */
  setCurrentModel(modelName) {
    if (!this.pricing[modelName]) {
      throw new Error(`Modelo no encontrado: ${modelName}`);
    }
    this.currentModel = modelName;
  }

  /**
   * Obtiene modelo actual
   * @returns {string} - Nombre del modelo actual
   */
  getCurrentModel() {
    return this.currentModel;
  }

  /**
   * Valida si un modelo existe
   * @param {string} modelName - Nombre del modelo
   * @returns {boolean} - true si existe
   */
  modelExists(modelName) {
    return this.pricing.hasOwnProperty(modelName);
  }

  /**
   * Obtiene estadisticas de uso
   * @param {Array} tokenHistory - Historial de tokens
   * @returns {Object} - Estadisticas
   */
  getUsageStats(tokenHistory) {
    try {
      if (!Array.isArray(tokenHistory) || tokenHistory.length === 0) {
        return {
          totalTokens: 0,
          totalCost: 0,
          averagePerRequest: 0
        };
      }

      const totalTokens = tokenHistory.reduce((sum, item) => sum + (item.tokens || 0), 0);
      const totalCost = tokenHistory.reduce((sum, item) => sum + (item.cost || 0), 0);
      const averagePerRequest = totalTokens / tokenHistory.length;

      return {
        totalTokens,
        totalCost: this.formatCost(totalCost),
        totalCostFormatted: this.formatCostToString(totalCost),
        averagePerRequest: Math.round(averagePerRequest),
        requests: tokenHistory.length
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadisticas: ${error.message}`);
    }
  }
}

module.exports = new TokenCounterService();