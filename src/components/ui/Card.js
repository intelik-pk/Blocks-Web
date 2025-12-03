import React from 'react';
import { cn } from '../../utils/cn';

const Card = ({ 
  children, 
  className = '', 
  hover = false,
  variant = 'primary', // 'primary', 'secondary', 'tertiary'
  ...props 
}) => {
  const variantStyles = {
    primary: {
      // Main content cards - subtle blue gradient
      base: 'bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10',
      gradient: 'bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 dark:from-blue-500/10 dark:via-transparent dark:to-purple-500/10',
    },
    secondary: {
      // Action panels, modals, expanded content - subtle purple/pink gradient
      base: 'bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/15',
      gradient: 'bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 dark:from-purple-500/15 dark:via-transparent dark:to-pink-500/15',
    },
    tertiary: {
      // Nested cards, sub-sections - subtle green gradient
      base: 'bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/15 dark:border-white/8',
      gradient: 'bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 dark:from-green-500/10 dark:via-transparent dark:to-emerald-500/10',
    },
  };

  const variantStyle = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      className={cn(
        'text-card-foreground rounded-lg shadow-lg relative overflow-hidden',
        variantStyle.base,
        variantStyle.gradient,
        hover && 'hover:shadow-xl transition-all duration-200',
        className
      )}
      style={{
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3 className={cn('text-lg font-semibold text-card-foreground', className)} {...props}>
      {children}
    </h3>
  );
};

const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
};

const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={cn('mt-4 pt-4 border-t border-border', className)} {...props}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
