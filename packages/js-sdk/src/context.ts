/*!
 * Convert JS SDK
 * Version 1.0.0
 * Copyright(c) 2020 Convert Insights, Inc
 * License Apache-2.0
 */
import {ContextInterface} from './interfaces/context';
import {EventManagerInterface} from '@convertcom/js-sdk-event';
import {ExperienceManagerInterface} from '@convertcom/js-sdk-experience';
import {FeatureManagerInterface} from './interfaces/feature-manager';
import {LogManagerInterface} from '@convertcom/js-sdk-logger';
import {DataManagerInterface} from '@convertcom/js-sdk-data';

import {
  Config,
  Id,
  BucketedFeature,
  BucketedVariation,
  BucketingAttributes,
  ConversionAttributes,
  SegmentsData,
  SegmentsAttributes,
  Entity,
  Experience,
  Variation
} from '@convertcom/js-sdk-types';

import {
  ERROR_MESSAGES,
  RuleError,
  SystemEvents,
  SegmentsKeys
} from '@convertcom/js-sdk-enums';
import {objectDeepMerge} from '@convertcom/js-sdk-utils';
import {SegmentsManagerInterface} from '@convertcom/js-sdk-segments';

/**
 * Provides visitor context
 * @category Main
 * @constructor
 * @implements {ContextInterface}
 */
export class Context implements ContextInterface {
  private _eventManager: EventManagerInterface;
  private _experienceManager: ExperienceManagerInterface;
  private _featureManager: FeatureManagerInterface;
  private _dataManager: DataManagerInterface;
  private _segmentsManager: SegmentsManagerInterface;
  private _loggerManager: LogManagerInterface;
  private _config: Config;
  private _visitorId: Id;
  private _visitorProperties: Record<string, any>;
  private _environment: string;

  /**
   * @param {Config} config
   * @param {Object} dependencies
   * @param {ApiManagerInterface} dependencies.apiManager
   * @param {EventManagerInterface} dependencies.eventManager
   * @param {ExperienceManagerInterface} dependencies.experienceManager
   * @param {FeatureManagerInterface} dependencies.featureManager
   * @param {DataManagerInterface} dependencies.dataManager
   * @param {LogManagerInterface} dependencies.loggerManager
   */
  constructor(
    config: Config,
    visitorId: Id,
    {
      eventManager,
      experienceManager,
      featureManager,
      segmentsManager,
      dataManager,
      loggerManager
    }: {
      eventManager: EventManagerInterface;
      experienceManager: ExperienceManagerInterface;
      featureManager: FeatureManagerInterface;
      segmentsManager: SegmentsManagerInterface;
      dataManager: DataManagerInterface;
      loggerManager?: LogManagerInterface;
    },
    visitorProperties?: Record<string, any>
  ) {
    this._environment = config?.environment;
    this._visitorId = visitorId;

    this._config = config;
    this._eventManager = eventManager;
    this._experienceManager = experienceManager;
    this._featureManager = featureManager;
    this._dataManager = dataManager;
    this._segmentsManager = segmentsManager;
    this._loggerManager = loggerManager;

    if (visitorProperties && visitorProperties.constructor === Object) {
      const {properties} =
        this._dataManager.filterReportSegments(visitorProperties);
      if (properties) this._visitorProperties = properties;
      segmentsManager.putSegments(visitorId, visitorProperties);
    }
  }

  /**
   * Get variation from specific experience
   * @param {string} experienceKey An experience's key that should be activated
   * @param {BucketingAttributes=} attributes An object that specifies attributes for the visitor
   * @param {Record<any, any>=} attributes.locationProperties An object of key-value pairs that are used for location matching
   * @param {Record<any, any>=} attributes.visitorProperties An object of key-value pairs that are used for audience targeting
   * @param {string=} attributes.environment Overwrite the environment
   * @return {BucketedVariation}
   */
  runExperience(
    experienceKey: string,
    attributes?: BucketingAttributes
  ): BucketedVariation | RuleError {
    if (!this._visitorId) {
      this._loggerManager?.error?.(
        'Context.runExperience()',
        ERROR_MESSAGES.VISITOR_ID_REQUIRED
      );
      return;
    }
    const visitorProperties = this.getVisitorProperties(
      attributes?.visitorProperties
    );
    const bucketedVariation = this._experienceManager.selectVariation(
      this._visitorId,
      experienceKey,
      visitorProperties, // represents audiences
      attributes?.locationProperties, // represents site_area/locations
      attributes?.environment || this._environment
    );
    if (Object.values(RuleError).includes(bucketedVariation as RuleError))
      return bucketedVariation as RuleError;
    if (bucketedVariation) {
      this._eventManager.fire(
        SystemEvents.BUCKETING,
        {
          visitorId: this._visitorId,
          experienceKey,
          variationKey: (bucketedVariation as BucketedVariation).key
        },
        null,
        true
      );
    }
    return bucketedVariation as BucketedVariation;
  }

  /**
   * Get variations across all experiences
   * @param {BucketingAttributes=} attributes An object that specifies attributes for the visitor
   * @param {string=} attributes.locationProperties An object of key-value pairs that are used for location matching
   * @param {Record<any, any>=} attributes.visitorProperties An object of key-value pairs that are used for audience targeting
   * @param {string=} attributes.environment Overwrite the environment
   * @return {Array<BucketedVariatio | RuleError>}
   */
  runExperiences(
    attributes?: BucketingAttributes
  ): Array<BucketedVariation | RuleError> {
    if (!this._visitorId) {
      this._loggerManager?.error?.(
        'Context.runExperiences()',
        ERROR_MESSAGES.VISITOR_ID_REQUIRED
      );
      return;
    }
    const visitorProperties = this.getVisitorProperties(
      attributes?.visitorProperties
    );
    const bucketedVariations = this._experienceManager.selectVariations(
      this._visitorId,
      visitorProperties,
      attributes?.locationProperties,
      attributes?.environment || this._environment
    );
    // Return rule errors if present
    const matchedErrors = bucketedVariations.filter((match) =>
      Object.values(RuleError).includes(match as RuleError)
    );
    if (matchedErrors.length) return matchedErrors as Array<RuleError>;

    (bucketedVariations as Array<BucketedVariation>).forEach(
      ({experienceKey, key}) => {
        this._eventManager.fire(
          SystemEvents.BUCKETING,
          {
            visitorId: this._visitorId,
            experienceKey,
            variationKey: key
          },
          null,
          true
        );
      }
    );
    return bucketedVariations as Array<BucketedVariation>;
  }

  /**
   * Get feature and its status
   * @param {string} key A feature key
   * @param {BucketingAttributes=} attributes An object that specifies attributes for the visitor
   * @param {string=} attributes.locationProperties An object of key-value pairs that are used for location matching
   * @param {Record<any, any>=} attributes.visitorProperties An object of key-value pairs that are used for audience targeting
   * @param {string=} attributes.environment Overwrite the environment
   * @param {boolean=} attributes.typeCasting Control automatic type conversion to the variable's defined type. Does not do any JSON validation. Defaults to `true`
   * @param {Array<string>=} attributes.experienceKeys Use only specific experiences
   * @return {BucketedFeature | RuleError | Array<BucketedFeature | RuleError>}
   */
  runFeature(
    key: string,
    attributes?: BucketingAttributes
  ): BucketedFeature | RuleError | Array<BucketedFeature | RuleError> {
    if (!this._visitorId) {
      this._loggerManager?.error?.(
        'Context.runFeature()',
        ERROR_MESSAGES.VISITOR_ID_REQUIRED
      );
      return;
    }
    const visitorProperties = this.getVisitorProperties(
      attributes?.visitorProperties
    );
    const bucketedFeature = this._featureManager.runFeature(
      this._visitorId,
      key,
      visitorProperties,
      attributes?.locationProperties,
      Object.prototype.hasOwnProperty.call(attributes || {}, 'typeCasting')
        ? attributes.typeCasting
        : true,
      attributes?.experienceKeys,
      attributes?.environment || this._environment
    );
    if (Array.isArray(bucketedFeature)) {
      // Return rule errors if present
      const matchedErrors = bucketedFeature.filter((match) =>
        Object.values(RuleError).includes(match as RuleError)
      );
      if (matchedErrors.length) return matchedErrors as Array<RuleError>;

      (bucketedFeature as Array<BucketedFeature>).forEach(
        ({experienceKey, status}) => {
          this._eventManager.fire(
            SystemEvents.BUCKETING,
            {
              visitorId: this._visitorId,
              experienceKey,
              featureKey: key,
              status
            },
            null,
            true
          );
        }
      );
    } else {
      if (Object.values(RuleError).includes(bucketedFeature as RuleError))
        return bucketedFeature as RuleError;

      if (bucketedFeature) {
        this._eventManager.fire(
          SystemEvents.BUCKETING,
          {
            visitorId: this._visitorId,
            experienceKey: (bucketedFeature as BucketedFeature).experienceKey,
            featureKey: key,
            status: (bucketedFeature as BucketedFeature).status
          },
          null,
          true
        );
      }
    }
    return bucketedFeature as BucketedFeature;
  }

  /**
   * Get features and their statuses
   * @param {BucketingAttributes=} attributes An object that specifies attributes for the visitor
   * @param {string=} attributes.locationProperties An object of key-value pairs that are used for location matching
   * @param {Record<any, any>=} attributes.visitorProperties An object of key-value pairs that are used for audience targeting
   * @param {string=} attributes.environment Overwrite the environment
   * @param {boolean=} attributes.typeCasting Control automatic type conversion to the variable's defined type. Does not do any JSON validation. Defaults to `true`
   * @return {Array<BucketedFeature | RuleError>}
   */
  runFeatures(
    attributes?: BucketingAttributes
  ): Array<BucketedFeature | RuleError> {
    if (!this._visitorId) {
      this._loggerManager?.error?.(
        'Context.runFeatures()',
        ERROR_MESSAGES.VISITOR_ID_REQUIRED
      );
      return;
    }
    const visitorProperties = this.getVisitorProperties(
      attributes?.visitorProperties
    );
    const bucketedFeatures = this._featureManager.runFeatures(
      this._visitorId,
      visitorProperties,
      attributes?.locationProperties,
      Object.prototype.hasOwnProperty.call(attributes || {}, 'typeCasting')
        ? attributes.typeCasting
        : true,
      null,
      attributes?.environment || this._environment
    );
    // Return rule errors if present
    const matchedErrors = bucketedFeatures.filter((match) =>
      Object.values(RuleError).includes(match as RuleError)
    );
    if (matchedErrors.length) return matchedErrors as Array<RuleError>;

    (bucketedFeatures as Array<BucketedFeature>).forEach(
      ({experienceKey, key, status}) => {
        this._eventManager.fire(
          SystemEvents.BUCKETING,
          {
            visitorId: this._visitorId,
            experienceKey,
            featureKey: key,
            status
          },
          null,
          true
        );
      }
    );
    return bucketedFeatures as Array<BucketedFeature>;
  }

  /**
   * Trigger Conversion
   * @param {Id} goalKey A goal key
   * @param {ConversionAttributes=} attributes An object that specifies attributes for the visitor
   * @param {Record<string, any>=} attributes.ruleData An object of key-value pairs that are used for goal matching
   * @param {Array<Record<GoalDataKey, number>>=} attributes.conversionData An object of key-value pairs that are used for audience targeting
   * @return {RuleError}
   */
  trackConversion(goalKey: Id, attributes?: ConversionAttributes): RuleError {
    if (!this._visitorId) {
      this._loggerManager?.error?.(
        'Context.trackConversion()',
        ERROR_MESSAGES.VISITOR_ID_REQUIRED
      );
      return;
    }

    const goalRule = attributes?.ruleData;
    const goalData = attributes?.conversionData;
    if (goalData) {
      if (!Array.isArray(goalData)) {
        this._loggerManager?.error?.(
          'Context.trackConversion()',
          ERROR_MESSAGES.GOAL_DATA_NOT_VALID
        );
        return;
      }
    }

    const segments = this._segmentsManager.getSegments(this._visitorId);
    const triggred = this._dataManager.convert(
      this._visitorId,
      goalKey,
      goalRule,
      goalData,
      segments
    );
    if (Object.values(RuleError).includes(triggred as RuleError))
      return triggred as RuleError;
    if (triggred) {
      this._eventManager.fire(
        SystemEvents.CONVERSION,
        {
          visitorId: this._visitorId,
          goalKey
        },
        null,
        true
      );
    }

    return;
  }

  /**
   * Set default segments for reports
   * @param {SegmentsData} segments A segment key
   */
  setDefaultSegments(segments: SegmentsData): void {
    const {segments: storedSegments} =
      this._dataManager.filterReportSegments(segments);
    if (storedSegments)
      this._segmentsManager.putSegments(this._visitorId, storedSegments);
  }

  /**
   * To be deprecated
   */
  setCustomSegments(
    segmentKeys: string[],
    attributes?: SegmentsAttributes
  ): RuleError {
    return this.runCustomSegments(segmentKeys, attributes);
  }

  /**
   * Match Custom segments
   * @param {Array<string>} segmentKeys A list of segment keys
   * @param {SegmentsAttributes=} attributes An object that specifies attributes for the visitor
   * @param {Record<string, any>=} attributes.ruleData An object of key-value pairs that are used for segments matching
   * @return {RuleError}
   */
  runCustomSegments(
    segmentKeys: Array<string>,
    attributes?: SegmentsAttributes
  ): RuleError {
    if (!this._visitorId) {
      this._loggerManager?.error?.(
        'Context.runCustomSegments()',
        ERROR_MESSAGES.VISITOR_ID_REQUIRED
      );
      return;
    }
    const segmentsRule = this.getVisitorProperties(attributes?.ruleData);
    const error = this._segmentsManager.selectCustomSegments(
      this._visitorId,
      segmentKeys,
      segmentsRule
    );
    if (error) return error as RuleError;

    return;
  }

  /**
   * Update visitor properties in memory
   * @param visitorProperties
   */
  updateVisitorProperties(
    visitorId: Id,
    visitorProperties: Record<string, any>
  ): void {
    this._dataManager.putData(visitorId, {segments: visitorProperties});
  }

  /**
   * get Config Entity
   * @param {string} key
   * @param {string} entityType
   * @return {Entity}
   */
  getConfigEntity(key: string, entityType: string): Entity {
    if (entityType === 'variations') {
      const experiences = this._dataManager.getEntitiesList(
        'experiences'
      ) as Array<Experience>;
      for (const {key: experienceKey} of experiences) {
        const variation = this._dataManager.getSubItem(
          'experiences',
          experienceKey,
          'variations',
          key,
          'key',
          'key'
        ) as Variation;
        if (variation) {
          return variation;
        }
      }
    }
    return this._dataManager.getEntity(key, entityType);
  }

  /**
   * Get visitor properties
   * @param {Record<string, any>=} attributes An object of key-value pairs that are used for audience targeting
   * @return {Record<string, any>}
   */
  private getVisitorProperties(
    attributes?: Record<string, any>
  ): Record<string, any> {
    const {segments} = this._dataManager.getData(this._visitorId) || {};
    const visitorProperties = attributes
      ? objectDeepMerge(this._visitorProperties || {}, attributes)
      : this._visitorProperties;
    return objectDeepMerge(segments || {}, visitorProperties);
  }
}
