import { Get, Post, Delete, Put, Body, Param, Res, Req, JsonController, Authorized, CurrentUser } from 'routing-controllers';
import { Inject, Container } from 'typedi';
import { ExamplesService } from './examples.service';
import { Example } from './example.model';
import { Request, Response } from 'express';
import { Current, logger } from '@aitheon/core-server';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { CategoriesApi } from '@aitheon/item-manager-server';
import { environment } from '../../environment';

@Authorized()
@JsonController('/api/examples')
export class ExamplesController {

  categoriesApi: CategoriesApi;
  // examplesService: ExamplesService;

  constructor(
    // examplesService: ExamplesService
  ) {
    this.categoriesApi = new CategoriesApi(`https://${ process.env.DOMAIN || 'dev.aitheon.com' }/item-manager`);
    // this.examplesService = Container.get('ExamplesService');
  }

  @Inject()
  examplesService: ExamplesService;

  @Get('/')
  @OpenAPI({ summary: 'List of examples by userId or organizationId', operationId: 'list' })
  @ResponseSchema(Example, {isArray: true})
  async list(@CurrentUser() current: Current, @Res() response: Response, @Req() request: Request) {
    const organizationId = current.organization ? current.organization._id : undefined;

    await this.examplesService.findAll();
    await this.examplesService.test();

    /**
     * Example for log usage
     * Note: it will automatically include service id so no need include it manually,
     * If pass optional request object to arguments then it will include to log
     * 1) current user id or/and 2) organization id, if it's exist in request object
     *
     * Important! Any logs must be grouped by brackets with some short logic text of it or function name, as example [ExamplesList]
     * If logic splited to some sub-function or etc. then must include sub-function text/name, as example [ExamplesList__Service_list_maybe_here]
     */
    const anyDataAsExample = { 'test': 123 };
    /**
     * Debug used for ONLY temporary output to console log and app.log file
     */
    logger.debug('[ExamplesList]: Debug message + plus data', { request, anyDataAsExample });

    /**
     * If needed Manually include user or organization, from *.service.ts files for example
     * logger.debug('[ExamplesList]: Debug message + plus data', { user: 'ID', organization: 'ID' });
     */

    /**
     * Functionallity of below functions
     * - visible/writed at console log;
     * - visible/writed at file logs/app.log
     * - visible/writed at DB logs model
     */
    /**
     * INFO - use for useful information about user actions and etc.
     */
    logger.info('[ExamplesList]: Important info + plus data', { request, anyDataAsExample });
    /**
     * WARN - use for any unexpected actions from user, or incorrect behaviour
     */
    logger.warn('[ExamplesList]: Some warning + plus data', { request, anyDataAsExample });
    /**
     * ERROR - user for any error or exception catched
     */
    logger.error('[ExamplesList]: Some error + plus data', { request, anyDataAsExample });
    /**
     * Audit Trail - used for rare case when need Audit some user actions
     */
    logger.log('audit_trail', '[ExamplesList]: audit_trail + plus data', { request, anyDataAsExample });

    const examples = organizationId ? await this.examplesService.findByOrg(organizationId) :
                                      await this.examplesService.findByUser(current.user._id);


    // await this.examplesService.test();
    /**
     * Example of item manager
     */
    try {
      const result = await this.categoriesApi.list({ headers: { 'Authorization': `JWT ${ current.token }`, 'organization-id': organizationId }});
      console.log('Result of item-manager:', result.body);
    } catch (error) {
      console.error('Result of item-manager:', error);
    }

    return response.json(examples);
  }

  @Post('/')
  @OpenAPI({ summary: 'Create example', operationId: 'create' })
  @ResponseSchema(Example)
  async create(@CurrentUser() current: Current, @Body() example: Example, @Res() response: Response) {
    /**
     * Example set to current organization
     */
    const organizationId = current.organization ? current.organization._id : undefined;
    example.organization = organizationId;

    /**
     * Example set to current user as owner of info
     */
    example.createdBy = current.user._id;

    const result = await this.examplesService.create(example);
    return response.json(result);
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Get example by id', operationId: 'getById' })
  @ResponseSchema(Example)
  async getById(@Param('id') id: string, @Res() response: Response) {
    const result = await this.examplesService.findById(id);
    return response.json(result);
  }

  @Put('/:id')
  @OpenAPI({ description: 'Update example by id', operationId: 'update' })
  async update(@Param('id') id: string, @Body() employee: Example, @Res() response: Response) {
    const result = await this.examplesService.update(employee);
    return response.sendStatus(204);
  }

  @Delete('/:id')
  @OpenAPI({ description: 'Remove example by id', operationId: 'remove' })
  async remove(@Param('id') id: string, @Res() response: Response) {
    const result = await this.examplesService.remove(id);
    return response.sendStatus(204);
  }

}
