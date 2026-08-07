import React, { useState } from 'react';

import {
  Label,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';

import { simpleTargetNames } from '@/constants';
import type { BootcDistributionItem } from '@/store/api/backend';
import { isImageType } from '@/store/slices/wizard';

type ImageSelectProps = {
  items: BootcDistributionItem[];
  selectedRef: string | undefined;
  onSelect: (event?: React.MouseEvent, selection?: string | number) => void;
  getLabel: (item: BootcDistributionItem) => string;
  placeholder?: string;
  isDisabled?: boolean;
  isOptionDisabled?: (item: BootcDistributionItem) => boolean;
  ariaDescribedBy?: string | undefined;
};

const toggleStyle = {
  minWidth: '20rem',
  maxWidth: '100%',
} as React.CSSProperties;

// The selected image name alone can be ambiguous (the installer and its
// payload share one name), so the toggle also shows the image:tag part
// of the reference.
const imageTag = (reference: string): string =>
  reference.split('/').pop() ?? reference;

const ImageSelect = ({
  items,
  selectedRef,
  onSelect,
  getLabel,
  placeholder = 'Select an image',
  isDisabled = false,
  isOptionDisabled,
  ariaDescribedBy,
}: ImageSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedItem = items.find((item) => item.reference === selectedRef);

  const handleSelect = (
    event?: React.MouseEvent,
    selection?: string | number,
  ) => {
    onSelect(event, selection);
    setIsOpen(false);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsOpen((prev) => !prev)}
      isExpanded={isOpen}
      isDisabled={isDisabled}
      style={toggleStyle}
      aria-describedby={ariaDescribedBy}
    >
      {selectedItem ? (
        <>
          {getLabel(selectedItem)}{' '}
          <span className='pf-v6-u-text-color-subtle'>
            {imageTag(selectedItem.reference)}
          </span>
        </>
      ) : (
        placeholder
      )}
    </MenuToggle>
  );

  return (
    <div className='pf-v6-u-mt-md'>
      <Select
        isOpen={isOpen}
        selected={selectedRef}
        onSelect={handleSelect}
        onOpenChange={(open) => setIsOpen(open)}
        toggle={toggle}
        shouldFocusToggleOnSelect
      >
        <SelectList>
          {items.length === 0 && (
            <SelectOption isDisabled>No images available</SelectOption>
          )}
          {items.map((item) => (
            <SelectOption
              key={item.reference}
              value={item.reference}
              description={item.reference}
              isDisabled={isOptionDisabled?.(item) ?? false}
            >
              {getLabel(item)}{' '}
              <Label color='blue' isCompact>
                {isImageType(item.type)
                  ? simpleTargetNames[item.type]
                  : item.type}
              </Label>
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    </div>
  );
};

export default ImageSelect;
