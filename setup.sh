#!/bin/bash

echo "Creating folders..."

mkdir -p public/images
mkdir -p public/icons
mkdir -p public/logos

mkdir -p src/app/login
mkdir -p src/app/signup
mkdir -p src/app/verify-email
mkdir -p src/app/forgot-password
mkdir -p src/app/reset-password
mkdir -p src/app/dashboard
mkdir -p src/app/profile
mkdir -p src/app/settings
mkdir -p src/app/notifications
mkdir -p src/app/users
mkdir -p src/app/roles
mkdir -p src/app/reports

mkdir -p src/components/common/Button
mkdir -p src/components/common/Input
mkdir -p src/components/common/Modal
mkdir -p src/components/common/Table
mkdir -p src/components/common/Loader
mkdir -p src/components/common/Pagination

mkdir -p src/components/auth/LoginForm
mkdir -p src/components/auth/SignupForm
mkdir -p src/components/auth/ForgotPasswordForm
mkdir -p src/components/auth/VerifyEmailForm

mkdir -p src/components/dashboard
mkdir -p src/components/users
mkdir -p src/components/roles
mkdir -p src/components/reports

mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/helpers
mkdir -p src/constants
mkdir -p src/types
mkdir -p src/validators
mkdir -p src/providers
mkdir -p src/auth
mkdir -p src/styles

echo "Creating page files..."

for dir in login signup verify-email forgot-password reset-password dashboard profile settings notifications users roles reports
do
  touch src/app/$dir/page.tsx
  touch src/app/$dir/page.module.css
done

echo "Creating services..."

touch src/services/api.ts
touch src/services/auth.service.ts
touch src/services/user.service.ts
touch src/services/role.service.ts
touch src/services/report.service.ts
touch src/services/notification.service.ts

echo "Creating hooks..."

touch src/hooks/useAuth.ts
touch src/hooks/useUser.ts
touch src/hooks/useRoles.ts
touch src/hooks/usePermissions.ts

echo "Creating helpers..."

touch src/helpers/date.helper.ts
touch src/helpers/string.helper.ts
touch src/helpers/validation.helper.ts
touch src/helpers/auth.helper.ts
touch src/helpers/storage.helper.ts

echo "Creating constants..."

touch src/constants/routes.ts
touch src/constants/roles.ts
touch src/constants/permissions.ts
touch src/constants/messages.ts

echo "Creating types..."

touch src/types/auth.types.ts
touch src/types/user.types.ts
touch src/types/role.types.ts
touch src/types/api.types.ts
touch src/types/common.types.ts

echo "Creating validators..."

touch src/validators/login.validator.ts
touch src/validators/signup.validator.ts
touch src/validators/user.validator.ts
touch src/validators/role.validator.ts

echo "Creating providers..."

touch src/providers/AuthProvider.tsx
touch src/providers/ThemeProvider.tsx
touch src/providers/QueryProvider.tsx

echo "Creating auth..."

touch src/auth/auth.ts
touch src/auth/permissions.ts
touch src/auth/middleware.ts

echo "Creating styles..."

touch src/styles/variables.css
touch src/styles/theme.css
touch src/styles/utilities.css

echo "Creating Button component..."

touch src/components/common/Button/Button.tsx
touch src/components/common/Button/Button.module.css
touch src/components/common/Button/index.ts

echo "Creating LoginForm component..."

touch src/components/auth/LoginForm/LoginForm.tsx
touch src/components/auth/LoginForm/LoginForm.module.css
touch src/components/auth/LoginForm/index.ts

echo "Done."