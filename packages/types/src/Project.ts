/*!
 * Convert JS SDK
 * Version 1.0.0
 * Copyright(c) 2020 Convert Insights, Inc
 * License Apache-2.0
 */
import {Id} from './Id';
import {
  DoNotTrack,
  GoogleAnalyticsType,
  ProjectType
} from '@convertcom/js-sdk-enums';
export type Project = {
  id: Id;
  name: string;
  type: ProjectType;
  environments: Record<string, string>;
  utc_offset: number;
  domains: Array<Record<string, any>>;
  // [
  //   {
  //     tld: string,
  //     hosts: null
  //   }
  // ],
  global_javascript?: string | ((...args: any) => any | undefined);
  settings: {
    auto_link: boolean;
    data_anonymization: boolean;
    do_not_track: DoNotTrack;
    include_jquery: boolean;
    min_order_value?: number;
    max_order_value?: number;
    integrations?: {
      google_analytics?: {
        enabled: boolean;
        type: GoogleAnalyticsType;
        measurementId?: string;
        property_UA?: string;
        auto_revenue_tracking: boolean;
      };
      kissmetrics?: {
        enabled: boolean;
      };
    };
  };
};
