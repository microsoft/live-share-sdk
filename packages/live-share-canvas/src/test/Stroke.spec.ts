import "mocha";
import { strict as assert } from "assert";
import { Stroke } from "../core/Stroke";
import {
    assertPointArraysEqual,
    copyPointArrayAndDuplidateEachPoint,
    reducePointArrayPrecision,
} from "./Utils.spec";
import { IPointerPoint } from "../core";

const testPoints: IPointerPoint[] = [
    {
        x: -17.5,
        y: -61.5,
        pressure: 0.5,
    },
    {
        x: -17.75500000000011,
        y: -61.670000000000016,
        pressure: 0.5,
    },
    {
        x: -19.199150000000145,
        y: -62.15110000000004,
        pressure: 0.5,
    },
    {
        x: -21.927369500000168,
        y: -62.87596300000007,
        pressure: 0.5,
    },
    {
        x: -25.683826435000242,
        y: -63.769480790000046,
        pressure: 0.5,
    },
    {
        x: -30.16580440855023,
        y: -64.59542795070001,
        pressure: 0.5,
    },
    {
        x: -35.09860664587177,
        y: -65.16217877943097,
        pressure: 0.5,
    },
    {
        x: -40.60824463473432,
        y: -65.33298380129315,
        pressure: 0.5,
    },
    {
        x: -46.65966204126073,
        y: -64.85177906600438,
        pressure: 0.5,
    },
    {
        x: -53.14322819750964,
        y: -63.53137425713925,
        pressure: 0.5,
    },
    {
        x: -61.03566248205749,
        y: -60.145838228993,
        pressure: 0.5,
    },
    {
        x: -70.16081700238158,
        y: -54.518277715991076,
        pressure: 0.5,
    },
    {
        x: -79.88105537213869,
        y: -46.941390247771665,
        pressure: 0.5,
    },
    {
        x: -89.35139514375368,
        y: -37.89291017154079,
        pressure: 0.5,
    },
    {
        x: -98.19182785512305,
        y: -27.946875404263494,
        pressure: 0.5,
    },
    {
        x: -105.80943347543678,
        y: -17.542889201900152,
        pressure: 0.5,
    },
    {
        x: -111.77563259476943,
        y: -7.233604936395523,
        pressure: 0.5,
    },
    {
        x: -116.32687461332495,
        y: 1.5307500355439743,
        pressure: 0.5,
    },
    {
        x: -119.9069269383375,
        y: 8.542700015471269,
        pressure: 0.5,
    },
    {
        x: -122.7327755213264,
        y: 14.166416002804851,
        pressure: 0.5,
    },
    {
        x: -122.66112797419538,
        y: 20.859983275994807,
        pressure: 0.5,
    },
    {
        x: -119.1129124450166,
        y: 28.3105697556706,
        pressure: 0.5,
    },
    {
        x: -112.13460956477445,
        y: 35.808066137044534,
        pressure: 0.5,
    },
    {
        x: -102.41757449864173,
        y: 43.15944308443403,
        pressure: 0.5,
    },
    {
        x: -90.7730693008063,
        y: 49.44302623377507,
        pressure: 0.5,
    },
    {
        x: -78.18939492075151,
        y: 54.54950334870375,
        pressure: 0.5,
    },
    {
        x: -64.55536059419626,
        y: 58.199326336888475,
        pressure: 0.5,
    },
    {
        x: -51.77893212990534,
        y: 60.16035235370981,
        pressure: 0.5,
    },
    {
        x: -40.838299435675935,
        y: 60.008605461989816,
        pressure: 0.5,
    },
    {
        x: -32.59047218449632,
        y: 58.65626908759157,
        pressure: 0.5,
    },
    {
        x: -26.921178287542148,
        y: 56.67853515550189,
        pressure: 0.5,
    },
    {
        x: -23.419931030182852,
        y: 54.299317213021766,
        pressure: 0.5,
    },
    {
        x: -21.427919126372217,
        y: 51.69882431556806,
        pressure: 0.5,
    },
    {
        x: -20.359166922983604,
        y: 49.0047777331946,
        pressure: 0.5,
    },
    {
        x: -19.76373244438207,
        y: 46.211942227364716,
        pressure: 0.5,
    },
    {
        x: -19.76118068953633,
        y: 43.41949429579785,
        pressure: 0.5,
    },
    {
        x: -20.48050409489224,
        y: 40.59195629972885,
        pressure: 0.5,
    },
    {
        x: -22.118480101438536,
        y: 38.14255473074047,
        pressure: 0.5,
    },
    {
        x: -24.70232648746719,
        y: 35.53361964202037,
        pressure: 0.5,
    },
    {
        x: -27.57485417761211,
        y: 33.03343675851687,
        pressure: 0.5,
    },
    {
        x: -31.37839281249046,
        y: 31.267661067817244,
        pressure: 0.5,
    },
    {
        x: -37.04083535180621,
        y: 31.019270840938475,
        pressure: 0.5,
    },
    {
        x: -44.37011461165707,
        y: 32.676799684539446,
        pressure: 0.5,
    },
    {
        x: -53.071834757600755,
        y: 36.365508159968215,
        pressure: 0.5,
    },
    {
        x: -62.51048292178041,
        y: 41.97272601048803,
        pressure: 0.5,
    },
    {
        x: -71.56302490716757,
        y: 49.28597151396502,
        pressure: 0.5,
    },
    {
        x: -79.7335816656427,
        y: 57.738979108329545,
        pressure: 0.5,
    },
    {
        x: -86.49915116172099,
        y: 66.93985645709574,
        pressure: 0.5,
    },
    {
        x: -91.58208021226756,
        y: 76.39551953377253,
        pressure: 0.5,
    },
    {
        x: -94.95959110145537,
        y: 86.2411127513696,
        pressure: 0.5,
    },
    {
        x: -97.33521605880185,
        y: 96.30792019243518,
        pressure: 0.5,
    },
    {
        x: -98.29604180747879,
        y: 107.06897748025392,
        pressure: 0.5,
    },
    {
        x: -96.7711275745458,
        y: 118.30277995252004,
        pressure: 0.5,
    },
    {
        x: -92.22257877040647,
        y: 129.73320859672458,
        pressure: 0.5,
    },
    {
        x: -83.02546597736773,
        y: 142.12377745738365,
        pressure: 0.5,
    },
    {
        x: -71.02758036469584,
        y: 153.73801971995806,
        pressure: 0.5,
    },
    {
        x: -57.458948896361676,
        y: 163.92467749885236,
        pressure: 0.5,
    },
    {
        x: -42.266611849813216,
        y: 172.34581121349447,
        pressure: 0.5,
    },
    {
        x: -25.530119312070838,
        y: 179.21759016452154,
        pressure: 0.5,
    },
    {
        x: -7.381752760147606,
        y: 184.40148931206647,
        pressure: 0.5,
    },
    {
        x: 11.362328485039143,
        y: 188.11518570278758,
        pressure: 0.5,
    },
    {
        x: 30.1927732651759,
        y: 190.46245232867432,
        pressure: 0.5,
    },
    {
        x: 48.58522420016436,
        y: 191.557468745743,
        pressure: 0.5,
    },
    {
        x: 66.09696155363065,
        y: 191.16020726750105,
        pressure: 0.5,
    },
    {
        x: 82.48634676624647,
        y: 189.2343412929049,
        pressure: 0.5,
    },
    {
        x: 96.71836042229256,
        y: 186.0215702858129,
        pressure: 0.5,
    },
    {
        x: 108.21724597852585,
        y: 181.94651783367874,
        pressure: 0.5,
    },
    {
        x: 116.9897569402932,
        y: 176.94308357588625,
        pressure: 0.5,
    },
    {
        x: 123.332753741327,
        y: 170.8810422390893,
        pressure: 0.5,
    },
    {
        x: 127.55268400581826,
        y: 164.47024439004565,
        pressure: 0.5,
    },
    {
        x: 129.99369285707485,
        y: 157.61490391921598,
        pressure: 0.5,
    },
    {
        x: 131.13026949700043,
        y: 150.5977000175344,
        pressure: 0.5,
    },
    {
        x: 131.42141200247318,
        y: 144.09748906371283,
        pressure: 0.5,
    },
    {
        x: 131.24034321478916,
        y: 138.5358104459708,
        pressure: 0.5,
    },
    {
        x: 130.85395047443308,
        y: 134.04888336128477,
        pressure: 0.5,
    },
    {
        x: 130.4305825236014,
        y: 130.77710964752328,
        pressure: 0.5,
    },
    {
        x: 129.9756995191733,
        y: 128.58411415056344,
        pressure: 0.5,
    },
    {
        x: 129.49738909869984,
        y: 127.30331699648764,
        pressure: 0.5,
    },
    {
        x: 128.83367774168414,
        y: 126.69635453004685,
        pressure: 0.5,
    },
    {
        x: 127.93509684708988,
        y: 126.52949302671846,
        pressure: 0.5,
    },
    {
        x: 127.07183993578735,
        y: 126.61104846051205,
        pressure: 0,
    },
];

function getSerialedStroke(id: string, timeStamp: number) {
    return `{"v":1,"id":"${id}","t":${timeStamp},"br":{"type":"pen","color":{"r":0,"g":0,"b":0},"tip":"ellipse","tipSize":10},"d":"-175,-615,50,-178,-617,50,-192,-622,50,-219,-629,50,-257,-638,50,-302,-646,50,-351,-652,50,-406,-653,50,-467,-649,50,-531,-635,50,-610,-601,50,-702,-545,50,-799,-469,50,-894,-379,50,-982,-279,50,-1058,-175,50,-1118,-72,50,-1163,15,50,-1199,85,50,-1227,142,50,-1227,209,50,-1191,283,50,-1121,358,50,-1024,432,50,-908,494,50,-782,545,50,-646,582,50,-518,602,50,-408,600,50,-326,587,50,-269,567,50,-234,543,50,-214,517,50,-204,490,50,-198,462,50,-198,434,50,-205,406,50,-221,381,50,-247,355,50,-276,330,50,-314,313,50,-370,310,50,-444,327,50,-531,364,50,-625,420,50,-716,493,50,-797,577,50,-865,669,50,-916,764,50,-950,862,50,-973,963,50,-983,1071,50,-968,1183,50,-922,1297,50,-830,1421,50,-710,1537,50,-575,1639,50,-423,1723,50,-255,1792,50,-74,1844,50,114,1881,50,302,1905,50,486,1916,50,661,1912,50,825,1892,50,967,1860,50,1082,1819,50,1170,1769,50,1233,1709,50,1276,1645,50,1300,1576,50,1311,1506,50,1314,1441,50,1312,1385,50,1309,1340,50,1304,1308,50,1300,1286,50,1295,1273,50,1288,1267,50,1279,1265,50,1271,1266,0"}`;
}

describe("Stroke", () => {
    it("has the expected number of points", async () => {
        const stroke = new Stroke();
        stroke.addPoints(...testPoints);

        assert(
            stroke.length === testPoints.length,
            `The stroke should have ${testPoints.length} points, but only has ${stroke.length}`
        );
    });

    it("removes consecutive duplicate points", async () => {
        const stroke = new Stroke();
        stroke.addPoints(...copyPointArrayAndDuplidateEachPoint(testPoints));

        assert(
            stroke.length === testPoints.length,
            `The stroke should have ${testPoints.length} points, but it has ${stroke.length} which means it didn't remove consecutive duplicate points`
        );
    });

    it("serializes as expected", async () => {
        const id = "abc";
        const timeStamp = Date.now();
        const expectedSerialedStroke = getSerialedStroke(id, timeStamp);

        const stroke = new Stroke({ id, timeStamp });
        stroke.addPoints(...testPoints);

        const serializedStroke = stroke.serialize();

        assert(
            serializedStroke === expectedSerialedStroke,
            `The stroke didn't serialize as expected.`
        );
    });

    it("deserializes as expected", async () => {
        const id = "abc";
        const timeStamp = Date.now();
        const serialedStroke = getSerialedStroke(id, timeStamp);

        const stroke = new Stroke();
        stroke.deserialize(serialedStroke);

        assert(
            stroke.id === id,
            `Deserialized stroke id should be ${id} but is ${stroke.id}`
        );
        assert(
            stroke.timeStamp === timeStamp,
            `Deserialized stroke timeStamp should be ${timeStamp} but is ${stroke.timeStamp}`
        );

        assertPointArraysEqual(reducePointArrayPrecision(testPoints), [
            ...stroke,
        ]);
    });
});
