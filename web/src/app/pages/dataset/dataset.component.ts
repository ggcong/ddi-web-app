import {Component, OnInit, ViewChild, OnDestroy} from '@angular/core';
import {Http} from "@angular/http";
import {DataSetDetail} from "../../model/DataSetDetail";
import {Subscription, Observable} from 'rxjs/Rx';
import {DataSetService} from "../../services/dataset.service";
import { ActivatedRoute } from '@angular/router';
import {EnrichmentService} from "../../services/enrichment.service";
import {EnrichmentInfo} from "../../model/EnrichmentInfo/EnrichmentInfo";
import {Section} from "../../model/EnrichmentInfo/Section";
import {Synonyms} from "../../model/EnrichmentInfo/Synonyms";
import {forEach} from "@angular/router/src/utils/collection";
import {SynonymResult} from "../../model/EnrichmentInfo/SynonymResult";
import {Synonym} from "../../model/EnrichmentInfo/Synonym";

@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.css']
})
export class DatasetComponent implements OnInit, OnDestroy {
  d: DataSetDetail = new DataSetDetail();
  subscription: Subscription;
  enrichmentSubscription: Subscription;
  synonymResultSubscription: Subscription;

  enrichmentInfo : EnrichmentInfo;
  synonymResult: SynonymResult;

  acc:string;
  repository:string;

  title_sections:Section[];
  abstract_sections:Section[];
  sample_protocol_sections:Section[];
  data_protocol_sections:Section[];

  constructor(private dataSetService: DataSetService, private route: ActivatedRoute, private enrichmentService: EnrichmentService) {
    console.info("DatasetComponent ctor");
    this.subscription = this.dataSetService.dataSetDetail$.subscribe(
      result => {
        console.info("dataSetDetail$ subscribtion");
        this.d = result;
        //TODO: update with canonical id
        this.acc = result.id;
        this.repository = result.source;
        console.info("dataSetDetailResult:" + result);
        console.info("publicationIds:" + result.publicationIds);
      });
  }

  ngOnInit() {
    this.subscription = this.route.params.subscribe(params => {
          this.acc = params['acc'];
          this.repository = params['domain'];
          this.dataSetService.getDataSetDetail(this.acc,this.repository);
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ontology_highlighted: boolean = false;

  getSynonyms(text: string): string[]{
    let result: string[];
    result = this.synonymResult.synonymsList.find(r => r.wordLabel == text).synonyms;
    return result;
  }

  get_section(str: string, synonyms: Synonym[]): Section[]{
    let result: Section[] = new Array<Section>();
    if(null==synonyms){
      result.push({text:str, beAnnotated: false, tobeReduced: false, synonyms: null});
      return result;
    }

    var i: number = 1;
    for (let entry of synonyms) {
      if(i<entry.from){
        let t = str.substr(i-1,entry.from-i);
        if(t!=" ") {
          result.push({text:t, beAnnotated: false, tobeReduced: false, synonyms: null});
        }
      }
      let original_text = entry.text;
      let text = str.substr(entry.from-1, entry.to-entry.from+1);
      result.push(
        { text:text,
          beAnnotated:true,
          tobeReduced:false,
          synonyms: this.getSynonyms(original_text)
        }
      );
      i = entry.to+1;
    }
    if(i < str.length){
      result.push({text:str.substr(i,str.length-i), beAnnotated:false, tobeReduced:false, synonyms:null});
    }
    return result;
  }

  process_sections(){
    let description = this.enrichmentInfo.originalAttributes.description.replace("Â³loopingÂ²","WloopingW");

    this.title_sections = this.get_section(this.enrichmentInfo.originalAttributes.name, this.enrichmentInfo.synonyms.name);
    this.abstract_sections = this.get_section(description, this.enrichmentInfo.synonyms.description);
    this.sample_protocol_sections = this.get_section(this.enrichmentInfo.originalAttributes.sample_protocol, this.enrichmentInfo.synonyms.sample_protocol);
    this.data_protocol_sections = this.get_section(this.enrichmentInfo.originalAttributes.data_protocol, this.enrichmentInfo.synonyms.data_protocol);

    var str = this.enrichmentInfo.originalAttributes.name;
    this.ontology_highlighted = true;
  }

  enrich_click(){
    if(this.ontology_highlighted){
      this.title_sections = null;
      this.abstract_sections = null;
      this.sample_protocol_sections = null;
      this.data_protocol_sections = null;

      console.log("remove hightlighting");
      this.ontology_highlighted = false;
    }else {

      Observable.forkJoin(
        [this.enrichmentService.getEnrichmentInfo1(this.repository,this.acc),
        this.enrichmentService.getSynonyms1(this.repository,this.acc)]
      ).subscribe(
        data => {
          console.log("subscription to forkJoin");
          this.enrichmentInfo = data[0];
          this.synonymResult = data[1];
          console.log("calling process_sections");
          this.process_sections();
        }
      )

      console.log("add hightlighting");

    }

    //this.enrichmentService.getEnrichmentInfo(this.repository, this.acc);
  }
}