// ============================================
// VEXORA CHAT - Input Validation (Joi Schemas)
// ============================================

const Joi = require('joi');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'اطلاعات ارسالی نامعتبر است',
        errors
      });
    }

    req[source] = value;
    next();
  };
};

const signupSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'نام کاربری فقط باید شامل حروف و اعداد باشد',
    'string.min': 'نام کاربری باید حداقل 3 کاراکتر باشد',
    'string.max': 'نام کاربری نباید بیشتر از 30 کاراکتر باشد',
    'any.required': 'نام کاربری الزامی است'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'فرمت ایمیل نامعتبر است',
    'any.required': 'ایمیل الزامی است'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
    'string.min': 'رمز عبور باید حداقل 8 کاراکتر باشد',
    'string.pattern.base': 'رمز عبور باید شامل حرف بزرگ، کوچک، عدد و کاراکتر خاص باشد',
    'any.required': 'رمز عبور الزامی است'
  }),
  passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'رمزهای عبور مطابقت ندارند',
    'any.required': 'تکرار رمز عبور الزامی است'
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'فرمت ایمیل نامعتبر است',
    'any.required': 'ایمیل الزامی است'
  }),
  password: Joi.string().required().messages({
    'any.required': 'رمز عبور الزامی است'
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
    'string.pattern.base': 'رمز جدید باید شامل حرف بزرگ، کوچک، عدد و کاراکتر خاص باشد',
  }),
  newPasswordConfirm: Joi.string().valid(Joi.ref('newPassword')).required(),
});

const createChatSchema = Joi.object({
  title: Joi.string().min(3).max(255).required().messages({
    'string.min': 'عنوان باید حداقل 3 کاراکتر باشد',
    'string.max': 'عنوان نباید بیشتر از 255 کاراکتر باشد',
  }),
  content: Joi.string().min(1).max(5000).required().messages({
    'string.max': 'متن نباید بیشتر از 5000 کاراکتر باشد',
  }),
});

const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().max(100).allow(''),
  bio: Joi.string().max(500).allow(''),
  location: Joi.string().max(100).allow(''),
});

const createGameSessionSchema = Joi.object({
  gameId: Joi.number().integer().required(),
  title: Joi.string().max(255).allow(''),
  maxPlayers: Joi.number().integer().min(2).max(100).default(10),
});

const submitScoreSchema = Joi.object({
  score: Joi.number().integer().min(0).required(),
});

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'شناسه نامعتبر است',
  }),
});

module.exports = {
  validate,
  signupSchema,
  loginSchema,
  changePasswordSchema,
  createChatSchema,
  createCommentSchema,
  paginationSchema,
  updateProfileSchema,
  createGameSessionSchema,
  submitScoreSchema,
  idParamSchema,
};
